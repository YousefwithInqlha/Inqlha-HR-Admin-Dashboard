/* =====================================================================
   INQLHA – card photo cleanup (used by the dashboard and the employee form)
   Finds the card inside a photo or screenshot, crops it, paints the old
   background out of the rounded corners and turns it upright.
   ===================================================================== */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const cdist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/* finds the card inside a photo/screenshot: the area that differs from the border colour */
function findCard(img) {
  const k = Math.min(1, 700 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const at = (x, y) => { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const edge = [];
  for (let x = 0; x < w; x += 3) edge.push(at(x, 0), at(x, h - 1));
  for (let y = 0; y < h; y += 3) edge.push(at(0, y), at(w - 1, y));
  const med = j => edge.map(p => p[j]).sort((a, b) => a - b)[edge.length >> 1];
  const bg = [med(0), med(1), med(2)];
  const fg = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fg[y * w + x] = cdist(at(x, y), bg) > 60 ? 1 : 0;
  const rows = [], cols = new Array(w).fill(0);
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) { n += fg[y * w + x]; cols[x] += fg[y * w + x]; } rows.push(n); }
  const span = (arr, len) => { let a = arr.findIndex(n => n > len * 0.3), b = arr.length - 1 - [...arr].reverse().findIndex(n => n > len * 0.3); return a < 0 ? null : [a, b]; };
  const ry = span(rows, w), rx = span(cols, h);
  if (!ry || !rx) return null;
  const box = { x: rx[0] / k, y: ry[0] / k, w: (rx[1] - rx[0] + 1) / k, h: (ry[1] - ry[0] + 1) / k, bg };
  if (box.w * box.h < img.width * img.height * 0.15) return null;
  if (box.w > img.width * 0.98 && box.h > img.height * 0.98) return null; // nothing to cut
  return box;
}

/* draws the card: cropped, rotated (quarter turns), with the corners cleaned */
function drawCard(img, box, turns) {
  const src = box || { x: 0, y: 0, w: img.width, h: img.height };
  const inset = box ? Math.round(Math.min(src.w, src.h) * 0.004) : 0;
  const sx = src.x + inset, sy = src.y + inset, sw = src.w - inset * 2, sh = src.h - inset * 2;
  const side = ((turns % 4) + 4) % 4;
  const k = Math.min(1, 1200 / Math.max(sw, sh));
  const cw = Math.round(sw * k), ch = Math.round(sh * k);
  const c = document.createElement('canvas');
  c.width = side % 2 ? ch : cw; c.height = side % 2 ? cw : ch;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.translate(c.width / 2, c.height / 2); g.rotate(side * Math.PI / 2);
  g.drawImage(img, sx, sy, sw, sh, -cw / 2, -ch / 2, cw, ch);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (box) {
    /* the rounded corners still show the old background: paint them with the card colour */
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, W = c.width, H = c.height;
    const R = Math.round(Math.min(W, H) * 0.09);
    const pick = (x, y) => { const i = (y * W + x) * 4; return [p[i], p[i + 1], p[i + 2]]; };
    const paper = pick(Math.round(W / 2), Math.min(H - 1, R));
    [[0, 0], [W - R, 0], [0, H - R], [W - R, H - R]].forEach(([x0, y0]) => {
      for (let y = y0; y < y0 + R; y++) for (let x = x0; x < x0 + R; x++) {
        const i = (y * W + x) * 4;
        if (cdist([p[i], p[i + 1], p[i + 2]], box.bg) < 90) { p[i] = paper[0]; p[i + 1] = paper[1]; p[i + 2] = paper[2]; }
      }
    });
    g.putImageData(d, 0, 0);
  }
  return c;
}

