declare module 'react-native-tflite' {
  export interface TFLiteModelOptions {
    model: string;
    numThreads?: number;
  }

  export interface TFLiteImageOptions {
    path?: string;
    model?: string;
    imageMean?: number;
    imageStd?: number;
    threshold?: number;
    numResults?: number;
    numResultsPerClass?: number;
  }

  export interface TFLiteDetection {
    confidence?: number;
    confidenceInClass?: number;
    rect?: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      left?: number;
      top?: number;
      width?: number;
      height?: number;
    };
    detectedClass?: number;
    classIndex?: number;
  }

  export default class Tflite {
    static loadModel(options: TFLiteModelOptions): Promise<void>;
    
    static runModelOnImage(
      options: TFLiteImageOptions,
      imageData?: number[]
    ): Promise<TFLiteDetection[]>;
    
    static detectObjectOnImage(
      options: TFLiteImageOptions
    ): Promise<TFLiteDetection[]>;
  }
}