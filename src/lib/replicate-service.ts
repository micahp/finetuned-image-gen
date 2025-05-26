import Replicate from 'replicate'

interface TrainingImage {
  id: string
  filename: string
  url: string
  size: number
}

interface ReplicateTrainingParams {
  modelName: string
  triggerWord: string
  trainingImages: TrainingImage[] // Kept for backwards compatibility but not used
  zipUrl: string // REQUIRED: Must be a valid ZIP file URL for Replicate training
  steps?: number
  learningRate?: number
  loraRank?: number
  batchSize?: number
  resolution?: string
}

interface ReplicateTrainingResponse {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  urls?: {
    get: string
    cancel: string
  }
  error?: string
  output?: any
  logs?: string
  input?: any
  destinationModelId?: string // The destination model ID created for training
}

interface ReplicateGenerationResponse {
  id: string
  status: 'completed' | 'failed' | 'processing'
  images?: Array<{
    url: string
    width: number
    height: number
  }>
  error?: string
}

export class ReplicateService {
  private client: Replicate

  constructor(apiToken?: string) {
    // Try multiple sources for the API token
    const token = apiToken || 
                  process.env.REPLICATE_API_TOKEN || 
                  process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN
    
    if (!token) {
      console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('REPLICATE')))
      throw new Error('Replicate API token is required. Please set REPLICATE_API_TOKEN environment variable.')
    }
    
    // console.log(`✅ Replicate API token loaded (${token.substring(0, 8)}...)`)
    
    this.client = new Replicate({
      auth: token,
    })
  }

  /**
   * Create a destination model for training
   */
  async createDestinationModel(modelName: string, description?: string): Promise<{ success: boolean; modelId?: `${string}/${string}`; error?: string }> {
    try {
      console.log(`Creating destination model: ${modelName}`)
      
      // For now, use a fixed owner name (can be made dynamic later)
      const owner = 'micahp'
      
      // Generate unique model ID with timestamp and random suffix
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const modelId = `flux-lora-${modelName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${randomSuffix}`
      
      // Use the correct models.create API with positional arguments
      const model = await this.client.models.create(
        owner,
        modelId,
        {
          description: description || `Fine-tuned FLUX LoRA model for ${modelName}`,
          visibility: 'private' as const, // Start as private
          hardware: 'gpu-t4' as const // Required field
        }
      )
      
      console.log(`✅ Successfully created model: ${owner}/${modelId}`)
      const destinationId = `${owner}/${modelId}` as `${string}/${string}`
      return {
        success: true,
        modelId: destinationId
      }
    } catch (error) {
      console.error('Failed to create destination model:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Start FLUX LoRA training using Replicate
   */
  async startTraining(params: ReplicateTrainingParams): Promise<ReplicateTrainingResponse> {
    try {
      // Ensure we have a valid ZIP URL - this is REQUIRED for Replicate validation
      if (!params.zipUrl) {
        throw new Error('ZIP URL is required for Replicate training. Please create a ZIP file of training images first.')
      }

      // Validate ZIP URL format
      if (!params.zipUrl.startsWith('http') && !params.zipUrl.startsWith('/api/')) {
        throw new Error(`Invalid ZIP URL format: ${params.zipUrl}. Must be a valid HTTP URL or API endpoint.`)
      }
      
      console.log(`Using training images ZIP: ${params.zipUrl}`)
      
      // Step 1: Create destination model if it doesn't exist
      console.log('Creating destination model...')
      const modelResult = await this.createDestinationModel(params.modelName)
      
      if (!modelResult.success) {
        throw new Error(`Failed to create destination model: ${modelResult.error}`)
      }
      
      console.log(`Using destination model: ${modelResult.modelId}`)
      
      // Step 2: Start training with the created model and ZIP URL
      console.log('Starting Replicate training with ZIP file...')
      const training = await this.client.trainings.create(
        "ostris",
        "flux-dev-lora-trainer",
        "c6e78d2501e8088876e99ef21e4460d0dc121af7a4b786b9a4c2d75c620e300d",
        {
          destination: modelResult.modelId!,
          input: {
            input_images: params.zipUrl, // Use the provided ZIP URL
            trigger_word: params.triggerWord,
            steps: params.steps || 1000,
            lora_rank: params.loraRank || 16,
            optimizer: "adamw8bit",
            batch_size: params.batchSize || 1,
            resolution: params.resolution || "512,768,1024",
            autocaption: true,
            learning_rate: params.learningRate || 0.0004,
            caption_dropout_rate: 0.05,
            cache_latents_to_disk: false,
            wandb_project: "flux_train_replicate",
            wandb_save_interval: 100,
            wandb_sample_interval: 100,
            gradient_checkpointing: false,
          }
        }
      )

      console.log('✅ Replicate training created successfully:', training.id)
      return {
        id: String(training.id),
        status: training.status as 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled',
        urls: training.urls,
        destinationModelId: modelResult.modelId, // Include the destination model ID
      }

    } catch (error) {
      console.error('❌ Replicate training error:', error)
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      })
      
      return {
        id: `error_${Date.now()}`,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Check training status
   */
  async getTrainingStatus(trainingId: string): Promise<ReplicateTrainingResponse> {
    try {
      const training = await this.client.trainings.get(trainingId)
      
      // Log detailed status for debugging
      if (training.status === 'failed' || training.error) {
        console.log('🔍 REPLICATE STATUS DEBUG - Training failed details:', {
          id: training.id,
          status: training.status,
          error: training.error,
          logs: training.logs,
          input: training.input, // This might show us what input Replicate received
          created_at: training.created_at,
          completed_at: training.completed_at
        })
      }
      
      return {
        id: String(training.id),
        status: training.status as 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled',
        urls: training.urls,
        output: training.output,
        logs: typeof training.logs === 'string' ? training.logs : undefined,
        error: typeof training.error === 'string' ? training.error : undefined,
        input: training.input, // Capture input parameters to see what Replicate received
      }

    } catch (error) {
      console.error('Error getting training status:', error)
      return {
        id: trainingId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to get status'
      }
    }
  }

  /**
   * Generate image with trained Replicate model directly
   */
  async generateWithTrainedModel(params: {
    prompt: string
    replicateModelId: string  // e.g., "micahp/flux-lora-xyz"
    triggerWord?: string
    width?: number
    height?: number
    steps?: number
    aspectRatio?: '1:1' | '16:9' | '9:16' | '3:4' | '4:3'
    seed?: number
  }): Promise<ReplicateGenerationResponse> {
    try {
      console.log('🎨 Starting Replicate trained model generation:', {
        prompt: params.prompt,
        replicateModelId: params.replicateModelId,
        triggerWord: params.triggerWord
      })

      // Build the enhanced prompt with trigger word
      let enhancedPrompt = params.prompt
      if (params.triggerWord && !params.prompt.toLowerCase().includes(params.triggerWord.toLowerCase())) {
        enhancedPrompt = `${params.triggerWord}, ${params.prompt}`
      }

      // Calculate dimensions based on aspect ratio
      const dimensions = this.getDimensions(params.aspectRatio)
      const width = params.width || dimensions.width
      const height = params.height || dimensions.height

      console.log('🔧 Replicate trained model parameters:', {
        prompt: enhancedPrompt,
        model: params.replicateModelId,
        width,
        height,
        num_inference_steps: params.steps || 28,
        seed: params.seed
      })

      // Run the prediction using the trained model directly
      const prediction = await this.client.run(
        params.replicateModelId as `${string}/${string}`,
        {
          input: {
            prompt: enhancedPrompt,
            width,
            height,
            num_inference_steps: params.steps || 28,
            seed: params.seed,
            guidance_scale: 3.5,
            num_outputs: 1,
            output_format: "webp",
            output_quality: 90
          }
        }
      ) as any

      console.log('🎨 Replicate trained model generation completed:', {
        id: prediction.id,
        status: prediction.status,
        hasOutput: !!prediction.output
      })

      // Handle the response
      if (prediction.status === 'succeeded' && prediction.output) {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        
        return {
          id: String(prediction.id),
          status: 'completed',
          images: [{
            url: imageUrl,
            width,
            height
          }]
        }
      } else if (prediction.status === 'failed') {
        return {
          id: String(prediction.id),
          status: 'failed',
          error: prediction.error || 'Replicate trained model generation failed'
        }
      } else {
        return {
          id: String(prediction.id),
          status: 'processing'
        }
      }

    } catch (error) {
      console.error('❌ Replicate trained model generation error:', error)
      return {
        id: `replicate_trained_err_${Date.now()}`,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Replicate trained model generation failed'
      }
    }
  }

  /**
   * Generate image with LoRA using Replicate
   */
  async generateWithLoRA(params: {
    prompt: string
    loraPath: string  // HuggingFace repository path
    loraScale?: number
    triggerWord?: string
    width?: number
    height?: number
    steps?: number
    aspectRatio?: '1:1' | '16:9' | '9:16' | '3:4' | '4:3'
    seed?: number
  }): Promise<ReplicateGenerationResponse> {
    try {
      console.log('🎨 Starting Replicate LoRA generation:', {
        prompt: params.prompt,
        loraPath: params.loraPath,
        triggerWord: params.triggerWord
      })

      // Build the enhanced prompt with trigger word
      let enhancedPrompt = params.prompt
      if (params.triggerWord && !params.prompt.toLowerCase().includes(params.triggerWord.toLowerCase())) {
        enhancedPrompt = `${params.triggerWord}, ${params.prompt}`
      }

      // Calculate dimensions based on aspect ratio
      const dimensions = this.getDimensions(params.aspectRatio)
      const width = params.width || dimensions.width
      const height = params.height || dimensions.height

      // Format LoRA path for Replicate (expects HuggingFace format)
      const formattedLoraPath = params.loraPath.startsWith('https://huggingface.co/') 
        ? params.loraPath 
        : `https://huggingface.co/${params.loraPath}`

      console.log('🔧 Replicate generation parameters:', {
        prompt: enhancedPrompt,
        lora_url: formattedLoraPath,
        lora_scale: params.loraScale || 1.0,
        width,
        height,
        num_inference_steps: params.steps || 28,
        seed: params.seed
      })

      // Run the prediction using black-forest-labs/flux-dev-lora
      const prediction = await this.client.run(
        "black-forest-labs/flux-dev-lora",
        {
          input: {
            prompt: enhancedPrompt,
            lora_url: formattedLoraPath,
            lora_scale: params.loraScale || 1.0,
            width,
            height,
            num_inference_steps: params.steps || 28,
            seed: params.seed,
            go_fast: true, // Use optimized inference
            guidance_scale: 3.5,
            num_outputs: 1,
            output_format: "webp",
            output_quality: 90
          }
        }
      ) as any

      console.log('🎨 Replicate generation completed:', {
        id: prediction.id,
        status: prediction.status,
        hasOutput: !!prediction.output
      })

      // Handle the response
      if (prediction.status === 'succeeded' && prediction.output) {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        
        return {
          id: String(prediction.id),
          status: 'completed',
          images: [{
            url: imageUrl,
            width,
            height
          }]
        }
      } else if (prediction.status === 'failed') {
        return {
          id: String(prediction.id),
          status: 'failed',
          error: prediction.error || 'Replicate generation failed'
        }
      } else {
        return {
          id: String(prediction.id),
          status: 'processing'
        }
      }

    } catch (error) {
      console.error('❌ Replicate LoRA generation error:', error)
      return {
        id: `replicate_err_${Date.now()}`,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Replicate generation failed'
      }
    }
  }

  /**
   * Get dimensions based on aspect ratio
   */
  private getDimensions(aspectRatio?: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1344, height: 768 }
      case '9:16':
        return { width: 768, height: 1344 }
      case '3:4':
        return { width: 896, height: 1152 }
      case '4:3':
        return { width: 1152, height: 896 }
      case '1:1':
      default:
        return { width: 1024, height: 1024 }
    }
  }

  /**
   * Cancel training
   */
  async cancelTraining(trainingId: string): Promise<boolean> {
    try {
      await this.client.trainings.cancel(trainingId)
      return true
    } catch (error) {
      console.error('Error canceling training:', error)
      return false
    }
  }

  /**
   * Get available Replicate models for FLUX training
   */
  getAvailableTrainers() {
    return [
      {
        id: 'ostris/flux-dev-lora-trainer',
        name: 'FLUX Dev LoRA Trainer',
        description: 'Train LoRA models for FLUX.1-dev using ai-toolkit',
        version: 'c6e78d2501e8088876e99ef21e4460d0dc121af7a4b786b9a4c2d75c620e300d',
        estimatedTime: '10-30 minutes',
        cost: '$0.001525 per second'
      }
    ]
  }
} 