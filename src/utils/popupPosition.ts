export function calculatePopupPosition(anchorX: number, anchorY: number, screenW: number, screenH: number) {
  const popupW = 320;
  const popupH = 560; // Generous height for all sliders, switches, and buttons
  let posX = anchorX + 40;
  let posY = Math.max(25, anchorY - 60);

  if (posX + popupW > screenW - 20) {
    posX = anchorX - popupW - 40;
  }
  if (posX < 20) posX = 20;
  if (posY + popupH > screenH - 20) {
    posY = Math.max(20, screenH - popupH - 20);
  }

  return { posX: Math.round(posX), posY: Math.round(posY), popupW, popupH };
}
