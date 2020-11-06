function viewModeZPlane(context) {
  const xPlaneRow = context.image.xPlaneRow
  if (xPlaneRow) {
    xPlaneRow.style.display = 'none'
  }
  const yPlaneRow = context.image.yPlaneRow
  if (yPlaneRow) {
    yPlaneRow.style.display = 'none'
  }
  const zPlaneRow = context.image.zPlaneRow
  if (zPlaneRow) {
    zPlaneRow.style.display = 'flex'
  }
}

export default viewModeZPlane
