import * as styles from './DemoList.module.scss'
import clsx from 'clsx'

import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardMedia from '@mui/material/CardMedia'
import Collapse from '@mui/material/Collapse'
import Avatar from '@mui/material/Avatar'
import IconButton, { IconButtonProps } from '@mui/material/IconButton'
import { red } from '@mui/material/colors'
// import FavoriteIcon from '@mui/icons-material/Favorite';
// import ShareIcon from '@mui/icons-material/Share';
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import MoreVertIcon from '@mui/icons-material/MoreVert';

export const DemoContainer = (props: any) => {
  const { children } = props
  return <div className={styles.DemoContainer}>{children}</div>
}

export const DemoItem = (props: any) => {
  const { title, description, avator, uid, uname, repo, playground } = props
  return (
    <>
      <div className={clsx('card', styles.cardContainer)}>
        <header className="card-header">
          {/* <p className="card-header-title">{title}</p> */}
          <p className={clsx('title', 'card-header-title', styles.cardTitle)}>
            {title}
          </p>
          {/* <button className="card-header-icon" aria-label="more options">
            <span className="icon">
              <i className="fas fa-angle-down" aria-hidden="true"></i>
            </span>
          </button> */}
        </header>
        <div className="card-content" style={{ padding: 16 }}>
          <div className="content">{description}</div>
          <div className="media">
            <div className="media-left">
              <figure className="image is-48x48" style={{ margin: 0 }}>
                <img src={avator} alt="Placeholder image" />
              </figure>
            </div>
            <div className="media-content">
              <p className="title is-4">{uname}</p>
              <p className="subtitle is-6">{`@${uid}`}</p>
            </div>
          </div>
        </div>
        <footer className="card-footer">
          {repo && (
            <a href={repo} target="_blank" className="card-footer-item">
              View Source
            </a>
          )}
          {playground && (
            <a href={playground} target="_blank" className="card-footer-item">
              Playground
            </a>
          )}
          {/* <a href="#" className="card-footer-item">
            Delete
          </a> */}
        </footer>
      </div>
    </>
  )
}

export const DemoItemMui = (props: any) => {
  const { title, description, avator, uid, uname, repo, playground } = props
  return (
    <Card variant="outlined" sx={{ width: '360px', height: 'auto' }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: red[500] }} aria-label="recipe" src={avator}>
            R
          </Avatar>
        }
        title={uname}
        subheader={`@${uid}`}
      />
      <CardContent>
        <Typography variant="h4" component="div">
          {title}
        </Typography>
        <br />

        <Typography variant="body2">{description}</Typography>
      </CardContent>

      <CardActions>
        {repo && (
          <Button size="small" href={repo} target="_blank">
            Source Code
          </Button>
        )}
        {playground && (
          <Button size="small" href={repo} target="_blank">
            Playground
          </Button>
        )}
      </CardActions>
    </Card>
  )
}
