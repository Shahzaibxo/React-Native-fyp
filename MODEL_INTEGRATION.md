# YOLOv8 Model Integration Guide

This React Native app is designed to use your YOLOv8n TensorFlow Lite model for real-time object detection. Here's how to integrate your model:

## 1. Model File Placement

### For Android:
1. Create directory: `android/app/src/main/assets/model/`
2. Place your model files in this directory:
   - `yolov8n.json` (TensorFlow.js model file)
   - `yolov8n.bin` (model weights)
   
   OR
   
   - `yolov8n.tflite` (TensorFlow Lite model file)

### For iOS:
1. Add your model files to the iOS project bundle
2. Update the path in `ModelLoader.ts`

## 2. Model Format Conversion

If you have a `.tflite` file, you have two options:

### Option A: Convert to TensorFlow.js format
```bash
# Install tensorflowjs converter
pip install tensorflowjs

# Convert .tflite to .json format
tensorflowjs_converter \
    --input_format=tf_lite \
    --output_format=tfjs_graph_model \
    your_model.tflite \
    ./model_output/
```

### Option B: Use TensorFlow Lite React Native
```bash
# Install TensorFlow Lite for React Native
npm install react-native-tflite
```

Then update `ModelLoader.ts` to use TensorFlow Lite instead of TensorFlow.js.

## 3. Update Model Path

In `src/utils/ModelLoader.ts`, update the model path:

```typescript
const defaultModelPath = Platform.OS === 'android' 
  ? 'file:///android_asset/model/yolov8n.json'  // Update this path
  : 'model/yolov8n.json';  // Update this path
```

## 4. Model Input/Output Configuration

Update the preprocessing and postprocessing functions in `ModelLoader.ts` based on your specific YOLOv8 model:

- **Input size**: Usually 640x640 for YOLOv8
- **Output format**: Depends on your model's architecture
- **Class names**: Update the `classNames` array with your specific classes

## 5. Performance Optimization

For better performance:

1. **Reduce processing frequency**: Adjust `processInterval` in `FrameProcessor.ts`
2. **Optimize model size**: Use quantized models if available
3. **Adjust confidence threshold**: Update `confidenceThreshold` in `ModelLoader.ts`

## 6. Testing

1. Build and run the app:
   ```bash
   npx react-native run-android
   # or
   npx react-native run-ios
   ```

2. Point the camera at objects to test detection

## Current Implementation Status

Currently, the app is set up with:
- ✅ Camera integration with React Native Vision Camera
- ✅ TensorFlow.js setup
- ✅ Frame processing pipeline
- ✅ UI overlay for bounding boxes
- ⚠️ Mock predictions (replace with actual model inference)

## Next Steps

1. Place your YOLOv8n model file in the appropriate directory
2. Update the model path in `ModelLoader.ts`
3. Implement actual model inference (replace mock predictions)
4. Test and optimize performance
5. Fine-tune detection thresholds and UI elements

## Troubleshooting

- **Model not loading**: Check file paths and permissions
- **Performance issues**: Reduce processing frequency or use a smaller model
- **Detection accuracy**: Adjust confidence thresholds and preprocessing