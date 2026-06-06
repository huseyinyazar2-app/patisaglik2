function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadVideo(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = reject;
    video.src = src;
  });
}

function sampleCanvasFromImage(image, maxWidth = 360) {
  const ratio = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

function analyzePixels(ctx, width, height) {
  const data = ctx.getImageData(0, 0, width, height).data;
  let total = 0;
  let totalSq = 0;
  const luminance = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    luminance[p] = y;
    total += y;
    totalSq += y * y;
  }
  const count = luminance.length;
  const brightness = total / count;
  const contrast = Math.sqrt(Math.max(0, totalSq / count - brightness * brightness));
  let edgeTotal = 0;
  let edgeCount = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const lap = Math.abs(
        -4 * luminance[idx]
        + luminance[idx - 1]
        + luminance[idx + 1]
        + luminance[idx - width]
        + luminance[idx + width]
      );
      edgeTotal += lap;
      edgeCount += 1;
    }
  }
  return {
    brightness,
    contrast,
    sharpness: edgeCount ? edgeTotal / edgeCount : 0
  };
}

function issue(id, severity, messageKey) {
  return { id, severity, messageKey };
}

function buildScore(issues) {
  return Math.max(0, 100 - issues.reduce((sum, item) => sum + (item.severity === 'high' ? 28 : item.severity === 'medium' ? 16 : 8), 0));
}

function levelFromScore(score) {
  if (score >= 78) return 'good';
  if (score >= 55) return 'watch';
  return 'poor';
}

export async function analyzePhotoQuality(dataUrl) {
  const image = await loadImage(dataUrl);
  const { ctx, width, height } = sampleCanvasFromImage(image);
  const metrics = analyzePixels(ctx, width, height);
  const issues = [];

  if (image.naturalWidth < 720 || image.naturalHeight < 720) issues.push(issue('low_resolution', 'medium', 'qualityCheck.issues.low_resolution'));
  if (metrics.brightness < 54) issues.push(issue('too_dark', 'high', 'qualityCheck.issues.too_dark'));
  if (metrics.brightness > 220) issues.push(issue('too_bright', 'medium', 'qualityCheck.issues.too_bright'));
  if (metrics.contrast < 24) issues.push(issue('low_contrast', 'medium', 'qualityCheck.issues.low_contrast'));
  if (metrics.sharpness < 4.2) issues.push(issue('blurry', 'high', 'qualityCheck.issues.blurry'));

  const score = buildScore(issues);
  return {
    type: 'photo',
    score,
    level: levelFromScore(score),
    issues,
    metrics: {
      width: image.naturalWidth,
      height: image.naturalHeight,
      brightness: Math.round(metrics.brightness),
      contrast: Math.round(metrics.contrast),
      sharpness: Math.round(metrics.sharpness * 10) / 10
    }
  };
}

export async function analyzeVideoQuality(dataUrl) {
  const video = await loadVideo(dataUrl);
  const issues = [];
  if (Number(video.duration || 0) < 6) issues.push(issue('too_short', 'high', 'qualityCheck.issues.too_short'));
  if (video.videoWidth < 720 || video.videoHeight < 480) issues.push(issue('low_resolution', 'medium', 'qualityCheck.issues.low_resolution'));

  let frameMetrics = null;
  try {
    video.currentTime = Math.min(0.4, Number(video.duration || 1) / 2);
    await new Promise((resolve) => {
      video.onseeked = resolve;
      setTimeout(resolve, 900);
    });
    const canvas = document.createElement('canvas');
    const ratio = video.videoWidth > 360 ? 360 / video.videoWidth : 1;
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
    canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frameMetrics = analyzePixels(ctx, canvas.width, canvas.height);
    if (frameMetrics.brightness < 48) issues.push(issue('too_dark', 'high', 'qualityCheck.issues.too_dark'));
    if (frameMetrics.contrast < 20) issues.push(issue('low_contrast', 'medium', 'qualityCheck.issues.low_contrast'));
  } catch {}

  const score = buildScore(issues);
  return {
    type: 'video',
    score,
    level: levelFromScore(score),
    issues,
    metrics: {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: Math.round(Number(video.duration || 0) * 10) / 10,
      brightness: frameMetrics ? Math.round(frameMetrics.brightness) : null,
      contrast: frameMetrics ? Math.round(frameMetrics.contrast) : null
    }
  };
}
