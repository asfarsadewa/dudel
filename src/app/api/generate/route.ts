import { NextResponse } from 'next/server';

// Async function to check queue status and get results
async function checkQueueStatus(requestId: string, falKey: string, maxRetries = 20): Promise<Record<string, unknown>> {
  for (let i = 0; i < maxRetries; i++) {
    console.log(`[API] /api/generate: checking status for request ${requestId}, attempt ${i+1}`);
    
    try {
      const statusResponse = await fetch(
        `https://queue.fal.run/fal-ai/flux/requests/${requestId}/status`,
        {
          headers: {
            'Authorization': `Key ${falKey}`,
          },
        }
      );
      
      if (!statusResponse.ok) {
        console.error(`[API] Status check failed with code ${statusResponse.status}`);
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log(`[API] Status check result: ${statusData.status}`);
      
      if (statusData.status === 'COMPLETED') {
        // Get the result
        const resultResponse = await fetch(
          `https://queue.fal.run/fal-ai/flux/requests/${requestId}`,
          {
            headers: {
              'Authorization': `Key ${falKey}`,
            },
          }
        );
        
        if (!resultResponse.ok) {
          throw new Error(`Failed to get result: ${resultResponse.status}`);
        }
        
        return await resultResponse.json();
      } else if (statusData.status === 'FAILED') {
        throw new Error(`Request failed: ${JSON.stringify(statusData)}`);
      }
      
      // Wait before next check (increasing backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 + (i * 500)));
    } catch (error) {
      console.error(`[API] Error checking status: ${error}`);
      throw error;
    }
  }
  
  throw new Error('Max retries reached waiting for image generation');
}

// Helper function to fetch an image and convert to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    console.log('[API] Fetching image from URL:', imageUrl);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    console.log('[API] Successfully converted image to base64');
    return base64;
  } catch (error) {
    console.error('[API] Error fetching image:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    console.log('[API] /api/generate: request received');
    const { image, prompt } = await req.json();
    
    // Enhance prompt with beautification instruction
    // Format it more clearly to match the example
    let enhancedPrompt = "";
    
    if (!prompt || prompt.trim() === "") {
      // Default prompt when description is empty
      enhancedPrompt = "Interpret this image as you will, but make it beautiful while trying to adhere to the reference image and object placements.";
      console.log('[API] /api/generate: using default prompt (no description provided)');
    } else {
      // User provided a description
      const trimmedPrompt = prompt.trim();
      enhancedPrompt = `${trimmedPrompt}. make it beautiful while adhering to the reference image and object placements.`;
      console.log('[API] /api/generate: original prompt:', prompt);
    }
    
    console.log('[API] /api/generate: final prompt sent to AI:', enhancedPrompt);
    console.log('[API] /api/generate: image length:', image ? image.length : 0);
    console.log('[API] /api/generate: first 100 chars of image:', image ? image.substring(0, 100) + '...' : 'No image data');
    
    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      return NextResponse.json({ error: 'Missing FAL_KEY in environment' }, { status: 500 });
    }
    
    // Create a data URI from the base64 image
    const imageDataUrl = `data:image/png;base64,${image}`;
    
    console.log('[API] /api/generate: submitting request to FAL.AI queue');
    const response = await fetch(
      'https://queue.fal.run/fal-ai/flux/dev/image-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${FAL_KEY}`,
        },
        body: JSON.stringify({
          image_url: imageDataUrl,
          prompt: enhancedPrompt,
          strength: 0.95, // Increased from 0.8 to 0.95 for stronger transformation
          num_inference_steps: 40, // Increased from 30 to 40 for better quality
          guidance_scale: 3.5, // Added guidance scale parameter
          sync_mode: false, // Explicitly set to use async mode
          enable_safety_checker: false // Disable safety checker
        }),
      }
    );
    
    console.log('[API] /api/generate: queue submission status', response.status);
    const text = await response.text();
    console.log('[API] /api/generate: queue response', text);
    
    if (!response.ok) {
      console.error('[API] /api/generate: returning error status', response.status);
      return new NextResponse(text, { status: response.status });
    }
    
    const queueResponse = JSON.parse(text);
    
    if (!queueResponse.request_id) {
      return NextResponse.json({ error: 'No request_id in response' }, { status: 500 });
    }
    
    console.log(`[API] /api/generate: request queued with ID ${queueResponse.request_id}`);
    
    // Check queue status and wait for completion
    const result = await checkQueueStatus(queueResponse.request_id, FAL_KEY);
    console.log('[API] /api/generate: got final result');
    
    // Log the structure of the result to help debug
    console.log('[API] Result structure:', JSON.stringify(result, null, 2));
    
    // If the result contains an image URL, download it and convert to base64
    if (result.image && typeof result.image === 'object' && 'url' in result.image) {
      try {
        const imageUrl = result.image.url as string;
        console.log('[API] Downloading image from URL:', imageUrl);
        const imageBase64 = await fetchImageAsBase64(imageUrl);
        console.log('[API] Successfully downloaded and converted image to base64');
        return NextResponse.json({
          ...result,
          imageBase64
        });
      } catch (error) {
        console.error('[API] Error fetching image as base64:', error);
        return NextResponse.json({
          ...result,
          error_detail: 'Failed to convert image to base64, using URL directly'
        });
      }
    } else if (result.images && Array.isArray(result.images) && result.images.length > 0 && 
               typeof result.images[0] === 'object' && 'url' in result.images[0]) {
      // Handle images array (fal.ai uses this structure)
      try {
        const imageUrl = result.images[0].url as string;
        console.log('[API] Downloading image from images array URL:', imageUrl);
        const imageBase64 = await fetchImageAsBase64(imageUrl);
        console.log('[API] Successfully downloaded and converted images[0] to base64');
        return NextResponse.json({
          ...result,
          imageBase64
        });
      } catch (error) {
        console.error('[API] Error fetching image from images array:', error);
        return NextResponse.json({
          ...result,
          error_detail: 'Failed to convert image from images array to base64, using URL directly'
        });
      }
    } else if (result.result && typeof result.result === 'object' && 
               'image' in result.result && 
               result.result.image && 
               typeof result.result.image === 'object' && 
               'url' in result.result.image) {
      try {
        const imageUrl = result.result.image.url as string;
        console.log('[API] Downloading nested image from URL:', imageUrl);
        const imageBase64 = await fetchImageAsBase64(imageUrl);
        console.log('[API] Successfully downloaded and converted nested image to base64');
        return NextResponse.json({
          ...result,
          imageBase64
        });
      } catch (error) {
        console.error('[API] Error fetching nested image as base64:', error);
        return NextResponse.json({
          ...result,
          error_detail: 'Failed to convert nested image to base64, using URL directly'
        });
      }
    }
    
    // If no image URL found, just return the original result
    console.log('[API] No image URL found in result, returning original result');
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[API] /api/generate: error', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}