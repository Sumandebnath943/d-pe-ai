import { pipeline, env } from '@xenova/transformers';

// Disable local models since we are running in browser and want to fetch from HuggingFace hub
env.allowLocalModels = false;

class PipelineSingleton {
  static instance: any = null;

  static async getInstance(progress_callback: Function) {
    if (this.instance === null) {
      this.instance = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback
      });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { action, text } = event.data;

  if (action === 'load') {
    try {
      await PipelineSingleton.getInstance((x: any) => {
        // We send back progress if there's a progress event
        if (x.status === 'progress') {
          self.postMessage({ status: 'progress', message: Math.round(x.progress) });
        }
      });
      self.postMessage({ status: 'ready', message: 'Model loaded' });
    } catch (e: any) {
      self.postMessage({ status: 'error', message: e.message });
    }
  }

  if (action === 'embed' && text) {
    try {
      const extractor = await PipelineSingleton.getInstance(() => {});
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      // We convert the Float32Array to a normal array so it can be passed over postMessage easily
      const embedding = Array.from(output.data);
      
      self.postMessage({ 
        status: 'complete', 
        data: embedding 
      });
    } catch (e: any) {
      self.postMessage({ status: 'error', message: e.message });
    }
  }
});
