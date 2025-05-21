'use client';
import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const DudelCanvas: React.FC = () => {
  // flood-fill algorithm for fill tool
  const floodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const x0 = Math.floor(startX);
    const y0 = Math.floor(startY);
    const idx0 = (y0 * width + x0) * 4;
    const targetR = data[idx0];
    const targetG = data[idx0 + 1];
    const targetB = data[idx0 + 2];
    const targetA = data[idx0 + 3];
    // new fill color
    const [fillR, fillG, fillB, fillA] = hexToRgba(brushColor);
    if (
      targetR === fillR &&
      targetG === fillG &&
      targetB === fillB &&
      targetA === fillA
    ) {
      return;
    }
    const stack: [number, number][] = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      const idx = (y * width + x) * 4;
      if (
        x >= 0 && x < width &&
        y >= 0 && y < height &&
        data[idx] === targetR &&
        data[idx + 1] === targetG &&
        data[idx + 2] === targetB &&
        data[idx + 3] === targetA
      ) {
        // set pixel to fill color
        data[idx] = fillR;
        data[idx + 1] = fillG;
        data[idx + 2] = fillB;
        data[idx + 3] = fillA;
        // push neighbors
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  // helper to convert hex color to rgba array
  const hexToRgba = (hex: string): [number, number, number, number] => {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(ch => ch + ch).join('');
    }
    const bigint = parseInt(c, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b, 255];
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  // current drawing tool
  const [tool, setTool] = useState<'brush' | 'eraser' | 'line' | 'rect' | 'circle' | 'spray' | 'lasso' | 'fill'>('brush');
  // lasso tool points
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  // user description of drawing
  const [description, setDescription] = useState<string>("");
  // Input mode state
  const [inputMode, setInputMode] = useState<'sketch' | 'photo'>('sketch');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | null>(null);
  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<'submitting' | 'processing' | 'completed'>('submitting');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setPhotoMimeType(file.type); // Store MIME type
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUrl(reader.result as string);
        setError(null); // Clear any previous file read errors
      };
      reader.onerror = () => {
        console.error("FileReader error:", reader.error);
        setError(`Failed to read '${file.name}'. The file might be corrupted or not a supported image type. Please try a different file.`);
        setPhotoDataUrl(null);
        setSelectedFileName(null);
        setPhotoMimeType(null); // Reset MIME type on error
      };
      reader.readAsDataURL(file);
    }
  };

  // Resize canvas to full width of container, adjust aspect ratio based on screen orientation
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      const width = container.clientWidth;
      
      // Use a taller canvas on mobile portrait mode, more square-like for better drawing area
      const isMobile = window.innerWidth < 640;
      const aspectRatio = isMobile ? 4/5 : 2/3;  // Taller on mobile (5:4 instead of 3:2)
      
      const height = width * aspectRatio;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };
    
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // fill bucket
    if (tool === 'fill') {
      floodFill(x, y);
      return;
    }
    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
    // start lasso
    if (tool === 'lasso') {
      lassoPointsRef.current = [{ x, y }];
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tool === 'brush' || tool === 'eraser') {
      // brush or eraser
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
      }
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      setLastX(x);
      setLastY(y);
    } else if (tool === 'spray') {
      // spray tool: random dots around pointer
      ctx.fillStyle = brushColor;
      const density = 30;
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * brushSize;
        const dx = radius * Math.cos(angle);
        const dy = radius * Math.sin(angle);
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    } else if (tool === 'lasso') {
      // record lasso points
      lassoPointsRef.current.push({ x, y });
    }
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsDrawing(false);
      return;
    }
    const ctx = canvas.getContext('2d');
    // end freehand tools
    if (tool === 'brush' || tool === 'eraser' || tool === 'spray') {
      setIsDrawing(false);
      return;
    }
    // lasso tool: fill polygon
    if (tool === 'lasso' && isDrawing && ctx) {
      const pts = lassoPointsRef.current;
      if (pts.length > 2) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = brushColor;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
      }
      lassoPointsRef.current = [];
      setIsDrawing(false);
      return;
    }
    // shape tools
    if (isDrawing && ctx && (tool === 'line' || tool === 'rect' || tool === 'circle')) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      switch (tool) {
        case 'line':
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x, y);
          ctx.stroke();
          break;
        case 'rect':
          ctx.rect(lastX, lastY, x - lastX, y - lastY);
          ctx.stroke();
          break;
        case 'circle': {
          const cx = (lastX + x) / 2;
          const cy = (lastY + y) / 2;
          const r = Math.hypot(x - lastX, y - lastY) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Also clear the result image
    setResultImage(null);
    // Clear photo input
    setPhotoDataUrl(null);
    setSelectedFileName(null);
    setPhotoMimeType(null); // Reset MIME type
  };

  // Function to ensure canvas has content
  const hasCanvasContent = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    // Get image data from the entire canvas without dividing by devicePixelRatio
    // This ensures we check the entire canvas at its actual resolution
    const imageData = ctx.getImageData(
      0, 0, 
      canvas.width, 
      canvas.height
    );
    const data = imageData.data;
    
    // Check if there's any non-transparent pixel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        return true; // Found a non-transparent pixel
      }
    }
    
    console.log('[Client] hasCanvasContent: no content found in canvas', {
      width: canvas.width,
      height: canvas.height,
      dataLength: data.length
    });
    
    return false;
  };
  
  // generate via FAL.AI image-to-image API
  const handleGenerate = async () => {
    console.log('[Client] handleGenerate: starting');
    if (!canvasRef.current) {
      console.error('[Client] handleGenerate: no canvas ref');
      return;
    }
    // Description is now optional - we'll use a default if it's empty
    
    if (inputMode === 'sketch') {
      // Check if the canvas has any content only for sketch mode
      if (!hasCanvasContent()) {
        console.error('[Client] handleGenerate: canvas is empty');
        setError('Please draw something before generating!');
        return;
      }
    } else if (inputMode === 'photo') {
      if (!photoDataUrl || !photoMimeType) {
        console.error('[Client] handleGenerate: no photo selected or MIME type missing');
        setError('Photo data or MIME type is missing. Please re-select the photo.');
        setIsGenerating(false); // Reset loading state
        return;
      }
    }

    setIsGenerating(true);
    setGenerationStage('submitting');
    setError(null);
    setResultImage(null);
    
    // Display what we're sending to the AI
    console.log('[Client] handleGenerate: sending description to AI:', description);
    // Ensure the canvas is properly rendered before capturing
    // Use a better quality setting and ensure we get the full canvas
    const canvas = canvasRef.current;
    
    console.log('[Client] handleGenerate: canvas dimensions', {
      width: canvas.width, 
      height: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height,
      displayWidth: canvas.offsetWidth,
      displayHeight: canvas.offsetHeight
    });
    
    // Create a copy of the canvas to ensure we have a proper non-transparent background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      console.error('[Client] handleGenerate: failed to get temp canvas context');
      setError('Failed to process canvas image');
      setIsGenerating(false);
      return;
    }
    
    // Fill with white background
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the original canvas content directly without rescaling
    // This preserves all drawing at the original resolution
    tempCtx.drawImage(
      canvas, 
      0, 0
    );
    
    console.log('[Client] handleGenerate: temp canvas dimensions', {
      width: tempCanvas.width, 
      height: tempCanvas.height
    });
    
    // Get high-quality PNG with 1.0 quality from the temp canvas with white background
    let imagePayload = '';
    let mimeTypeForApi = '';

    if (inputMode === 'sketch') {
      const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
      console.log('[Client] handleGenerate: captured dataUrl of length for sketch', dataUrl.length);
      imagePayload = dataUrl.split(',')[1];
      mimeTypeForApi = 'image/png';
    } else if (inputMode === 'photo' && photoDataUrl && photoMimeType) {
      console.log('[Client] handleGenerate: using photoDataUrl of length', photoDataUrl.length);
      imagePayload = photoDataUrl.split(',')[1]; // Assuming photoDataUrl is base64 with prefix
      mimeTypeForApi = photoMimeType;
    }

    if (!imagePayload) {
      setError('No image data to send.');
      setIsGenerating(false);
      return;
    }
    
    const apiRequestBody = {
        image: imagePayload,
        prompt: description,
        mimeType: mimeTypeForApi,
        imageSize: inputMode === 'sketch' ? `${canvas.width}x${canvas.height}` : 'photo' // Added imageSize here
    };

    console.log('[Client] handleGenerate: sending POST to /api/generate', apiRequestBody);
    try {
      setGenerationStage('submitting');
      console.log('[Client] handleGenerate: submitting request to API');
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiRequestBody),
      });
      
      // After submission is accepted, set stage to processing
      setGenerationStage('processing');
      console.log('[Client] handleGenerate: request in processing queue');
      
      console.log('[Client] handleGenerate: received status', res.status);
      const text = await res.text();
      console.log('[Client] handleGenerate: received body text', text);
      if (!res.ok) {
        setError(text);
      } else {
        let json: Record<string, unknown>;
        try {
          json = JSON.parse(text);
          console.log('[Client] handleGenerate: parsed JSON', json);
          setGenerationStage('completed');
        } catch (parseErr: unknown) {
          console.error('[Client] handleGenerate: JSON parse error', parseErr);
          setError('Invalid JSON returned');
          return;
        }
        let output: string | null = null;
        
        console.log('[Client] handleGenerate: JSON structure:', JSON.stringify(json, null, 2));
        
        // First check if we have the locally stored base64 version
        if (typeof json.imageBase64 === 'string') {
          output = json.imageBase64;
          console.log('[Client] handleGenerate: found local imageBase64');
        }
        // Fallback to URL versions if base64 isn't available
        else if (json.image && typeof json.image === 'object' && 'url' in json.image && typeof json.image.url === 'string') {
          output = json.image.url;
          console.log('[Client] handleGenerate: found image.url:', output);
        } else if (json.images && Array.isArray(json.images) && json.images.length > 0 && typeof json.images[0] === 'string') {
          output = json.images[0];
          console.log('[Client] handleGenerate: found images array:', output);
        } else if (json.output && Array.isArray(json.output) && json.output.length > 0 && typeof json.output[0] === 'string') {
          output = json.output[0];
          console.log('[Client] handleGenerate: found output array:', output);
        } else if (json.result && typeof json.result === 'object' && 
                  'image' in json.result && 
                  json.result.image && 
                  typeof json.result.image === 'object' && 
                  'url' in json.result.image && 
                  typeof json.result.image.url === 'string') {
          // Handle nested result structure
          output = json.result.image.url;
          console.log('[Client] handleGenerate: found result.image.url:', output);
        }
        
        console.log('[Client] handleGenerate: final output type', typeof output);
        console.log('[Client] handleGenerate: final output value', output);
        
        // Handle the case where we have a URL but no local version
        if (output && typeof output === 'string' && output.startsWith('http')) {
          console.log('[Client] handleGenerate: setting URL directly', output);
        }
        
        setResultImage(output);
      }
    } catch (e: unknown) {
      console.error('[Client] handleGenerate: fetch error', e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setIsGenerating(false);
      console.log('[Client] handleGenerate: finished');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 w-[95%] sm:w-[90%] max-w-[900px]">
      {/* Controls for drawing - responsive for mobile */}
      <div className="flex flex-wrap gap-4 w-full justify-start items-center">
        {/* Mode Selection Buttons */}
        <div className="flex items-center space-x-2 mb-2">
          <Button
            onClick={() => setInputMode('sketch')}
            variant={inputMode === 'sketch' ? 'default' : 'outline'}
            size="sm"
          >
            Sketch Mode
          </Button>
          <Button
            onClick={() => setInputMode('photo')}
            variant={inputMode === 'photo' ? 'default' : 'outline'}
            size="sm"
          >
            Photo Mode
          </Button>
        </div>
      </div>
      {/* Controls for drawing - responsive for mobile */}
      <div className={`flex flex-wrap gap-4 w-full justify-start items-center ${inputMode === 'photo' ? 'hidden' : ''}`}>
        <label className="flex items-center space-x-1">
          <span className="text-sm">Tool:</span>
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value as 'brush' | 'eraser' | 'spray' | 'line' | 'rect' | 'circle' | 'lasso' | 'fill')}
            className="p-1 border rounded text-sm"
          >
            <option value="brush">Brush</option>
            <option value="eraser">Eraser</option>
            <option value="spray">Spray</option>
            <option value="line">Line</option>
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="lasso">Lasso</option>
            <option value="fill">Fill</option>
          </select>
        </label>
        
        <label className="flex items-center space-x-1">
          <span className="text-sm">Color:</span>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="w-7 h-7 p-0 border-0"
          />
        </label>
        
        <div className="flex items-center space-x-1 flex-1 min-w-[180px]">
          <span className="text-sm whitespace-nowrap">Size:</span>
          <input
            type="range"
            min={1}
            max={50}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm w-6 text-right">{brushSize}</span>
        </div>
      </div>

      {/* Photo Input UI */}
      {inputMode === 'photo' && !resultImage && (
        <div className="w-full space-y-2">
          {!photoDataUrl ? (
            <div className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg">
              <label htmlFor="photo-upload" className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm">
                Upload Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">Select an image file (PNG, JPG, etc.)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden border">
                <Image src={photoDataUrl} alt="Selected photo" layout="fill" objectFit="contain" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{selectedFileName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPhotoDataUrl(null);
                    setSelectedFileName(null);
                    setPhotoMimeType(null); // Reset MIME type
                    // Optionally, clear the file input value if needed
                    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  Clear Photo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full border border-gray-300 relative rounded-lg overflow-hidden shadow-md">
        {/* Canvas for drawing */}
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none w-full h-full"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          style={{
            display: (inputMode === 'photo' && photoDataUrl) || resultImage ? 'none' : 'block',
          }}
        />
        
        {/* Result image (overlays the canvas or photo preview when available) */}
        {resultImage && typeof resultImage === 'string' && (
          <div className="absolute top-0 left-0 w-full h-full slide-reveal">
            {resultImage.startsWith('data:') || resultImage.startsWith('http') ? (
              <Image
                src={resultImage}
                alt="Generated Image"
                className="w-full h-full object-cover rounded scale-in"
                fill={true} // Changed layout to fill
                style={{opacity: 0}} // Initial state, animation will override this
                priority={true}
                onLoad={(e) => {
                  // Once image is loaded, start the animation by making it visible
                  const img = e.currentTarget;
                  img.style.opacity = '1';
                  console.log('[Client] Image loaded successfully');
                }}
                onError={(e) => {
                  console.error('[Client] Image load error:', e);
                  setError('Failed to load generated image');
                }}
              />
            ) : (
              // For base64 strings we still use img because Next Image doesn't handle them well
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${resultImage}`}
                alt="Generated Image"
                className="w-full h-full object-cover rounded scale-in"
                style={{opacity: 0}} // Initial state, animation will override this
                onLoad={(e) => {
                  // Once image is loaded, start the animation by making it visible
                  const img = e.currentTarget;
                  img.style.opacity = '1';
                  console.log('[Client] Image loaded successfully');
                }}
                onError={(e) => {
                  console.error('[Client] Image load error:', e);
                  setError('Failed to load generated image');
                }}
              />
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 w-full">
        <Button onClick={clearCanvas} size="sm">Clear All</Button> {/* Changed Clear to Clear All */}
        {resultImage && (
          <Button 
            onClick={() => {
              setResultImage(null);
              // If in photo mode and a photo was uploaded, keep it.
              // If in sketch mode, canvas is already clear or will be cleared by clearCanvas.
            }}
            variant="outline"
            size="sm"
          >
            {inputMode === 'sketch' ? 'Back to Drawing' : 'Back to Photo'}
          </Button>
        )}
      </div>
      {/* user description input (optional) */}
      <div className="w-full">
        <label className="flex justify-between mb-1">
          <span className="text-sm font-medium">Description to guide the AI (optional)</span>
          <span className="text-xs text-gray-500">{description.length}/400</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={400}
          rows={2}
          placeholder="Describe to guide the AI of what you're drawing or leave empty to let the AI decide..."
          className="w-full border p-2 rounded resize-none"
        />
        {!description && (
          <div className="text-xs text-gray-500 mt-1 italic">
            Without a description, the AI will interpret your drawing freely.
          </div>
        )}
      </div>
      {/* generate button and result */}
      <div className="w-full flex items-center">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="sm"
          className="w-full sm:w-auto"
        >
          {isGenerating 
            ? generationStage === 'submitting' 
              ? 'Submitting...' 
              : generationStage === 'processing' 
                ? 'Processing...' 
                : 'Generating...' 
            : 'Generate'}
        </Button>
      </div>
      {error && (
        <div className="w-full text-red-600 mt-2">Error: {error}</div>
      )}
    </div>
  );
};

export default DudelCanvas;