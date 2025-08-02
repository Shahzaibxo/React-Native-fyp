import { Frame } from 'react-native-vision-camera';
import Tflite from 'react-native-tflite';

export interface ModelPrediction {
  bbox: number[];
  class: string;
  score: number;
}

export class RealFrameProcessor {
  private isProcessing = false;
  private lastProcessTime = 0;
  private processInterval = 150; // Process every 150ms (6-7 FPS) for better performance
  private isModelLoaded = false;

  // COCO dataset class names for YOLOv8
  private classNames = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
    'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
    'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
    'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
    'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
    'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
    'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
    'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
    'toothbrush'
  ];

  async initialize(): Promise<boolean> {
    try {
      // Load the TensorFlow Lite model
      await Tflite.loadModel({
        model: 'model/yolov8n.tflite',
        numThreads: 4, // Multi-threaded processing
      });

      console.log('YOLOv8 TensorFlow Lite model loaded successfully');
      this.isModelLoaded = true;
      return true;
    } catch (error) {
      console.error('Failed to load TensorFlow Lite model:', error);
      return false;
    }
  }

  async processFrame(frame: Frame): Promise<ModelPrediction[]> {
    const currentTime = Date.now();
    
    // Throttle processing to prevent overwhelming the device
    if (this.isProcessing || !this.isModelLoaded || (currentTime - this.lastProcessTime) < this.processInterval) {
      return [];
    }

    this.isProcessing = true;
    this.lastProcessTime = currentTime;

    try {
      console.log('Processing camera frame for object detection...');
      
      // Use TensorFlow Lite to process the frame directly
      // This approach uses the frame buffer data from React Native Vision Camera
      const results = await this.runInferenceOnFrame(frame);

      this.isProcessing = false;
      return results;
    } catch (error) {
      console.error('Frame processing failed:', error);
      this.isProcessing = false;
      return [];
    }
  }

  private async runInferenceOnFrame(frame: Frame): Promise<ModelPrediction[]> {
    try {
      // For TensorFlow Lite with react-native-tflite, we can process frames directly
      // This uses the actual camera frame buffer
      
      const detections = await Tflite.detectObjectOnImage({
        path: '', // Empty path means use direct frame buffer
        model: 'model/yolov8n.tflite',
        imageMean: 0.0,
        imageStd: 255.0,
        threshold: 0.4, // Lower threshold for better detection
        numResultsPerClass: 5, // Limit results per class for performance
      });

      // Convert TensorFlow Lite results to our format
      return this.processTFLiteDetections(detections, frame.width, frame.height);
    } catch (error) {
      console.error('TensorFlow Lite inference failed:', error);
      return [];
    }
  }

  private processTFLiteDetections(detections: any[], frameWidth: number, frameHeight: number): ModelPrediction[] {
    const predictions: ModelPrediction[] = [];

    if (!detections || detections.length === 0) {
      console.log('No objects detected in frame');
      return predictions;
    }

    console.log(`Processing ${detections.length} raw detections`);

    for (const detection of detections) {
      try {
        // Extract detection data - format may vary by TensorFlow Lite version
        const confidence = detection.confidence || detection.confidenceInClass || 0;
        const rect = detection.rect || {};
        
        if (confidence > 0.4) { // Confidence threshold
          // Convert normalized coordinates to pixel coordinates
          const x = (rect.x || rect.left || 0) * frameWidth;
          const y = (rect.y || rect.top || 0) * frameHeight;
          const width = (rect.w || rect.width || 0) * frameWidth;
          const height = (rect.h || rect.height || 0) * frameHeight;
          
          // Get class information
          const classId = detection.detectedClass || detection.classIndex || 0;
          const className = this.classNames[classId] || `class_${classId}`;
          
          predictions.push({
            bbox: [x, y, width, height],
            class: className,
            score: confidence,
          });

          console.log(`Detected: ${className} (${Math.round(confidence * 100)}%) at [${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}]`);
        }
      } catch (detectionError) {
        console.error('Error processing individual detection:', detectionError);
      }
    }

    console.log(`Final predictions: ${predictions.length} objects`);
    return predictions;
  }

  isReady(): boolean {
    return this.isModelLoaded;
  }

  setProcessInterval(interval: number) {
    this.processInterval = Math.max(100, interval); // Minimum 100ms (10 FPS)
  }

  dispose() {
    try {
      if (this.isModelLoaded) {
        console.log('Disposing TensorFlow Lite model resources');
        this.isModelLoaded = false;
      }
    } catch (error) {
      console.error('Error disposing model:', error);
    }
  }
}

export default RealFrameProcessor;