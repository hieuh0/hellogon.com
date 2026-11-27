const ART = String.raw`
                ______
               / o    \___
     /\/\/\/\_/   ,_____)    rawr!
    /           _/ \/\/
   /           |=-
  /    ___     |
 /____/   \____/
        |_|  |_|
`

/** Say hi to anyone who opens DevTools. */
export function logConsoleEgg() {
  console.log(`%c${ART}`, 'font-family: monospace; font-size: 13px; line-height: 1.15; color: #5cc960')
  console.log('%cRawr! Đừng soi vảy tui nữa mà.', 'font: 600 15px "Nunito", sans-serif; color: #5cc960')
  console.log('%cPsst… thử bấm ⌘K (hoặc /) trên trang xem.', 'font-family: monospace; color: #888')
}
