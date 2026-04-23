const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    let currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    html.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️ Tema' : '🌙 Tema';
    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', currentTheme);
      themeToggle.textContent = currentTheme === 'dark' ? '☀️ Tema' : '🌙 Tema';
    });

    const captureBtn = document.getElementById('captureBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusBox = document.getElementById('statusBox');
    const canvas = document.getElementById('screenCanvas');
    const ctx = canvas.getContext('2d');
    const video = document.getElementById('captureVideo');
    const targetWidth = document.getElementById('targetWidth');
    const targetHeight = document.getElementById('targetHeight');
    const formatSelect = document.getElementById('formatSelect');
    const qualityRange = document.getElementById('qualityRange');
    const qualityBadge = document.getElementById('qualityBadge');
    const compressionHint = document.getElementById('compressionHint');
    const originalInfo = document.getElementById('originalInfo');
    const selectionInfo = document.getElementById('selectionInfo');
    const outputInfo = document.getElementById('outputInfo');
    const compressionInfo = document.getElementById('compressionInfo');
    const selectionModeText = document.getElementById('selectionModeText');
    const formatInfo = document.getElementById('formatInfo');

    let sourceImage = null;
    let stream = null;
    let selection = null;
    let isDragging = false;
    let startPoint = null;

    function setStatus(text) {
      statusBox.textContent = text;
    }

    function updateOutputInfo() {
      outputInfo.textContent = `${targetWidth.value || 0} × ${targetHeight.value || 0}`;
    }

    function updateQualityInfo() {
      const value = parseInt(qualityRange.value, 10);
      qualityBadge.textContent = `${value}%`;
      compressionInfo.textContent = `${value}% de calidad`;
      if (value >= 90) {
        compressionHint.textContent = 'Alta calidad y compresión ligera.';
      } else if (value >= 75) {
        compressionHint.textContent = 'Equilibrio recomendable entre calidad y peso.';
      } else if (value >= 55) {
        compressionHint.textContent = 'Compresión media con pérdida visual moderada.';
      } else {
        compressionHint.textContent = 'Compresión fuerte. Puede notarse en texto y bordes.';
      }
    }

    function updateFormatInfo() {
      const mime = formatSelect.value;
      formatInfo.textContent = mime === 'image/jpeg' ? 'JPEG' : mime === 'image/webp' ? 'WEBP' : 'PNG';
    }

    targetWidth.addEventListener('input', updateOutputInfo);
    targetHeight.addEventListener('input', updateOutputInfo);
    qualityRange.addEventListener('input', updateQualityInfo);
    formatSelect.addEventListener('change', updateFormatInfo);
    updateOutputInfo();
    updateQualityInfo();
    updateFormatInfo();

    async function captureScreen() {
      try {
        setStatus('Esperando permiso del navegador para capturar la pantalla o ventana...');
        selectionModeText.textContent = 'Solicitando captura';
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        video.srcObject = stream;

        await new Promise(resolve => {
          video.onloadedmetadata = () => resolve();
        });

        await video.play();

        const width = video.videoWidth;
        const height = video.videoHeight;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        sourceImage = new Image();
        sourceImage.src = canvas.toDataURL('image/png');
        await new Promise(resolve => sourceImage.onload = resolve);

        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }

        selection = null;
        drawCanvas();
        downloadBtn.disabled = true;
        resetBtn.disabled = false;
        originalInfo.textContent = `${width} × ${height}`;
        selectionInfo.textContent = 'Sin selección';
        selectionModeText.textContent = 'Arrastra para recortar';
        setStatus('Captura lista. Arrastra sobre la imagen para seleccionar el área que quieres recortar.');
      } catch (error) {
        setStatus('No se pudo capturar. Revisa permisos del navegador y usa una página segura o localhost.');
        selectionModeText.textContent = 'Captura cancelada';
        console.error(error);
      }
    }

    function drawCanvas() {
      if (!sourceImage) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sourceImage, 0, 0);

      if (selection) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
        ctx.strokeStyle = '#ff4d4f';
        ctx.lineWidth = 2;
        ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);

        const handleSize = 8;
        const points = [
          [selection.x, selection.y],
          [selection.x + selection.w, selection.y],
          [selection.x, selection.y + selection.h],
          [selection.x + selection.w, selection.y + selection.h]
        ];

        ctx.fillStyle = '#ffffff';
        for (const [px, py] of points) {
          ctx.fillRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
        }
        ctx.restore();
      }
    }

    function getCanvasPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.round((event.clientX - rect.left) * scaleX),
        y: Math.round((event.clientY - rect.top) * scaleY)
      };
    }

    canvas.addEventListener('pointerdown', (event) => {
      if (!sourceImage) return;
      isDragging = true;
      startPoint = getCanvasPoint(event);
      selection = { x: startPoint.x, y: startPoint.y, w: 0, h: 0 };
      selectionModeText.textContent = 'Seleccionando';
      drawCanvas();
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!isDragging || !startPoint) return;
      const point = getCanvasPoint(event);
      const x = Math.min(startPoint.x, point.x);
      const y = Math.min(startPoint.y, point.y);
      const w = Math.abs(point.x - startPoint.x);
      const h = Math.abs(point.y - startPoint.y);
      selection = { x, y, w, h };
      drawCanvas();
      selectionInfo.textContent = `${w} × ${h}`;
    });

    function finishSelection() {
      if (!selection) return;
      isDragging = false;
      if (selection.w < 2 || selection.h < 2) {
        selection = null;
        selectionInfo.textContent = 'Sin selección';
        downloadBtn.disabled = true;
        drawCanvas();
        selectionModeText.textContent = 'Arrastra para recortar';
        setStatus('La selección fue demasiado pequeña. Intenta otra vez.');
        return;
      }
      downloadBtn.disabled = false;
      selectionModeText.textContent = 'Recorte listo';
      setStatus('Selección lista. Ya puedes guardar el recorte con la compresión elegida.');
    }

    canvas.addEventListener('pointerup', finishSelection);
    canvas.addEventListener('pointerleave', () => {
      if (isDragging) finishSelection();
    });

    function getExtensionFromMime(mime) {
      if (mime === 'image/jpeg') return 'jpg';
      if (mime === 'image/webp') return 'webp';
      return 'png';
    }

    function downloadSelection() {
      if (!sourceImage || !selection) return;

      const outW = parseInt(targetWidth.value, 10);
      const outH = parseInt(targetHeight.value, 10);
      if (!outW || !outH || outW < 1 || outH < 1) {
        setStatus('Ancho y alto finales deben ser válidos.');
        return;
      }

      const mime = formatSelect.value;
      const qualityPercent = parseInt(qualityRange.value, 10);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = outW;
      tempCanvas.height = outH;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';

      tempCtx.drawImage(
        sourceImage,
        selection.x,
        selection.y,
        selection.w,
        selection.h,
        0,
        0,
        outW,
        outH
      );

      const qualityValue = mime === 'image/png' ? undefined : Math.max(0.1, Math.min(1, qualityPercent / 100));

      tempCanvas.toBlob((blob) => {
        if (!blob) {
          setStatus('No se pudo generar la imagen final.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `captura-recorte.${getExtensionFromMime(mime)}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        const kb = (blob.size / 1024).toFixed(2);
        setStatus(`Descarga completada. Archivo exportado en ${outW} × ${outH}, formato ${getExtensionFromMime(mime).toUpperCase()} y tamaño aproximado de ${kb} KB.`);
      }, mime, qualityValue);
    }

    function resetSelection() {
      selection = null;
      downloadBtn.disabled = true;
      selectionInfo.textContent = 'Sin selección';
      selectionModeText.textContent = sourceImage ? 'Arrastra para recortar' : 'Esperando captura';
      if (sourceImage) drawCanvas();
      setStatus(sourceImage ? 'Selección limpiada. Puedes marcar otra zona.' : 'Pulsa “Nueva captura” para empezar.');
    }

    captureBtn.addEventListener('click', captureScreen);
    downloadBtn.addEventListener('click', downloadSelection);
    resetBtn.addEventListener('click', resetSelection);