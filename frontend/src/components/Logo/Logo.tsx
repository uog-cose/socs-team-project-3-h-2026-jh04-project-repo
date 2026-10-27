import mark from '../../assets/brand/pymecht-mark.png'
import classes from './Logo.module.css'

/** The pyMechT lockup: atom mark, divider, wordmark and the "UOG | SOE" subline. */
export function Logo() {
  return (
    <span className={classes.root} role="img" aria-label="pyMechT, UOG School of Engineering">
      {/* The mark is a white-on-transparent PNG used as a mask, so it takes the text colour. */}
      <span className={classes.mark} style={{ maskImage: `url(${mark})` }} aria-hidden />
      <span className={classes.divider} aria-hidden />
      <span className={classes.text} aria-hidden>
        <span className={classes.wordmark}>pyMechT</span>
        <span className={classes.subline}>UOG | SOE</span>
      </span>
    </span>
  )
}
