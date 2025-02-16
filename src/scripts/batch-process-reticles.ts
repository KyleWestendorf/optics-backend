import * as path from 'path';
import * as fs from 'fs/promises';
import { ReticleProcessor } from '../services/reticle-processor';

const reticleProcessor = new ReticleProcessor();

async function batchProcessReticles() {
  try {
    // Define directories using absolute paths
    const rootDir = path.resolve(__dirname, '..', '..');
    const reticleImagesDir = path.join(rootDir, 'data', 'reticle-images');
    const processedDir = path.join(rootDir, 'data', 'reticles');
    const cacheDir = path.join(rootDir, 'data', 'cache');

    console.log('Using directories:', {
      reticleImagesDir,
      processedDir,
      cacheDir
    });

    // Ensure directories exist
    await fs.mkdir(reticleImagesDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });
    await fs.mkdir(cacheDir, { recursive: true });

    // Get all image files
    const files = await fs.readdir(reticleImagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg'].includes(ext);
    });

    console.log(`Found ${imageFiles.length} reticle images to process:`, imageFiles);

    // Process each image
    for (const file of imageFiles) {
      try {
        console.log(`Processing ${file}...`);
        
        // Read image file
        const imagePath = path.join(reticleImagesDir, file);
        const imageBuffer = await fs.readFile(imagePath);
        
        // Generate name from filename without extension
        const name = path.basename(file, path.extname(file));
        console.log(`Using name: ${name}`);
        
        // Process image
        const result = await reticleProcessor.processImage(imageBuffer, name);
        
        console.log(`Successfully processed ${file}`);
        
        // Save metadata
        const metadataPath = path.join(cacheDir, `${name}.json`);
        console.log(`Writing metadata to: ${metadataPath}`);
        await fs.writeFile(metadataPath, JSON.stringify(result, null, 2));
        console.log(`Successfully wrote metadata for ${file}`);
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    console.log('Batch processing complete!');
    
  } catch (error) {
    console.error('Error during batch processing:', error);
  }
}

// Run the batch processor if this script is executed directly
if (require.main === module) {
  batchProcessReticles().catch(console.error);
}

export { batchProcessReticles }; 