import { getContent, http, getArchiveFile } from './http.js'
import stream, { pipeline } from 'stream'

import fs from 'fs'
import path from 'path'
import sig from 'signale'
import AdmZip from 'adm-zip'

const IMAGE_CDN_PREFIX = 'https://download.pingcap.com/images'
export const imageCDNs = {
  docs: IMAGE_CDN_PREFIX + '/docs',
  'docs-cn': IMAGE_CDN_PREFIX + '/docs-cn',
  'docs-dm': IMAGE_CDN_PREFIX + '/tidb-data-migration',
  'docs-tidb-operator': IMAGE_CDN_PREFIX + '/tidb-in-kubernetes',
  'dbaas-docs': IMAGE_CDN_PREFIX + '/tidbcloud',
  'docs-appdev': IMAGE_CDN_PREFIX + '/appdev',
}

/**
 * Retrieve all MDs recursively.
 *
 * @export
 * @param {Object} metaInfo
 * @param {string} metaInfo.repo - Short for owner/repo
 * @param {string} metaInfo.path - Subpath to the repository
 * @param {string} metaInfo.ref - which branch
 * @param {string} destDir - destination
 * @param {Object} [options]
 * @param {string[]} [options.ignore] - Specify the files to be ignored
 * @param {Array} [options.pipelines]
 */
export async function retrieveAllMDs(metaInfo, destDir, options) {
  const { repo, ref, path = '' } = metaInfo
  const { ignore = [], pipelines = [] } = options

  const data = (await getContent(repo, ref, path)).data

  if (Array.isArray(data)) {
    data.forEach(d => {
      const { type, name, download_url } = d
      const nextDest = `${destDir}/${name}`

      if (ignore.includes(name)) {
        return
      }

      if (type === 'dir') {
        retrieveAllMDs(
          {
            repo,
            ref,
            path: `${path}/${name}`,
          },
          nextDest,
          options
        )
      } else {
        if (name.endsWith('.md')) {
          writeContent(download_url, nextDest, pipelines)
        }
      }
    })
  } else {
    if (data.name.endsWith('.md')) {
      writeContent(
        data.download_url,
        destDir.endsWith('.md') ? destDir : `${destDir}/${data.name}`,
        pipelines
      )
    }
  }
}

/**
 * Generate destination. If a path is provided, special handling will be performed.
 *
 * @export
 * @param {string} repo
 * @param {string} path
 * @param {string} destDir
 */
export function genDest(repo, path, destDir, sync) {
  if (
    [
      'pingcap/docs-dm',
      'pingcap/docs-tidb-operator',
      'pingcap/docs-appdev',
    ].includes(repo)
  ) {
    const pathArr = path.split('/')
    const lang = pathArr[0]
    const pathWithoutLang = pathArr.slice(1).join('/')

    if (sync) {
      destDir = destDir.replace('en', lang)
    }

    return `${destDir}${pathWithoutLang ? '/' + pathWithoutLang : ''}`
  }

  return path ? `${destDir}/${path}` : destDir
}

/**
 * Write content through streams.
 *
 * @export
 * @param {string} url
 * @param {fs.PathLike} destPath
 * @param {Array} [pipelines=[]]
 */
export async function writeContent(download_url, destPath, pipelines = []) {
  const dir = path.dirname(destPath)

  if (!fs.existsSync(dir)) {
    sig.info(`Create empty dir: ${dir}`)
    fs.mkdirSync(dir, { recursive: true })
  }

  const readableStream = stream.Readable.from(
    (await http.get(download_url)).data
  )
  const writeStream = fs.createWriteStream(destPath)
  writeStream.on('close', () => sig.success('Downloaded:', download_url))

  pipeline(readableStream, ...pipelines.map(p => p()), writeStream, err => {
    if (err) {
      sig.error('Pipeline failed:', err)
    }
  })
}

/**
 * Similar to writeContent for retrieveAllMDs, writeFile is used for retrieveAllMDsFromZip.
 * @param {string} targetPath
 * @param {iterable: Iterable<any> | AsyncIterable<any>} contents
 * @param {any[]} pipelines
 */
function writeFile(targetPath, contents, pipelines) {
  fs.mkdir(path.dirname(targetPath), { recursive: true }, function (err) {
    if (err) {
      sig.error('write file error', entryName, `${err}`)
    }

    const readableStream = stream.Readable.from(contents)
    const writeStream = fs.createWriteStream(targetPath)
    writeStream.on('close', () => sig.success('writeStream:', targetPath))

    pipeline(readableStream, ...pipelines.map(p => p()), writeStream, err => {
      if (err) {
        sig.error('Pipeline failed:', err)
      }
    })
  })
}

export async function retrieveAllMDsFromZip(
  metaInfo,
  destDir,
  options,
  isRetry = false
) {
  const { repo, ref } = metaInfo
  const { ignore = [], pipelines = [] } = options

  const archiveFileName = `archive-${ref}-${new Date().getTime()}.zip`
  // Download archive
  await getArchiveFile(repo, ref, archiveFileName)
  sig.success('download archive file', archiveFileName)

  sig.start('unzip and filter files', archiveFileName)
  try {
    // Unzip archive
    const zip = new AdmZip(archiveFileName)
    const zipEntries = zip.getEntries()

    zipEntries.forEach(function (zipEntry) {
      // console.log(zipEntry.toString()) // outputs zip entries information
      const { entryName } = zipEntry
      sig.info('unzip file(entryName):', entryName)
      // Ignore if not markdown file
      if (!entryName.endsWith('.md')) {
        return
      }
      const relativePath = entryName.split(`-${ref}/`).pop()
      const relativePathNameList = relativePath.split('/')
      const filteredArray = ignore.filter(value =>
        relativePathNameList.includes(value)
      )
      // Ignore if file path contains any ignore words
      if (filteredArray?.length > 0) {
        return
      }
      writeFile(`${destDir}/${relativePath}`, zipEntry.getData(), pipelines)
    })
  } catch (error) {
    sig.error(`unzip ${archiveFileName} error`, error)
    if (isRetry) {
      return
    }
    sig.info(`retry retrieve`, ref)
    return retrieveAllMDsFromZip(metaInfo, destDir, options, true)
  }
}
