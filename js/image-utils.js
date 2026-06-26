/* image-utils.js — canvas-based image resize to 64×64 Base64 */

export function resizeImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        // Cover-crop: center-crop to square then scale
        const s = Math.min(img.width, img.height);
        const sx = (img.width  - s) / 2;
        const sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, 64, 64);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Derive avatar symbol from gender + roleAlignment array */
export function deriveSymbol(gender, roleAlignment = []) {
  if (roleAlignment.includes('Phản diện')) {
    return gender === 'Nữ' ? '🦹‍♀️' : gender === 'Nam' ? '🦹‍♂️' : '🦹';
  }
  if (gender === 'Nữ')  return '👩';
  if (gender === 'Nam') return '👨';
  return '🧑';
}

export const SYMBOL_PALETTE = ['👤','👩','👨','🧑','🦸','🦹','🧙','⚔️','🏹','🌸','🌟','🌀'];
