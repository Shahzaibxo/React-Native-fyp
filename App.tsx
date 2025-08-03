/**
 * Object Detection React Native App
 * Uses React Native Vision Camera and YOLOv8 for real-time object detection
 *
 * @format
 */

// import ObjectDetectionCamera from './src/components/ObjectDetectionCamera';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
// import { bundleResourceIO, fetch as rnFetch } from '@tensorflow/tfjs-react-native';
import RNFS from 'react-native-fs';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';


const cocoLabels = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
  'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat',
  'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
  'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table',
  'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster',
  'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

function App() {
  const camera = useRef<Camera>(null);
  const devices = useCameraDevice('back');
  const device = devices;
  const [model, setModel]: any = useState(null);
  const [predictions, setPredictions]: any = useState([]);
  const processingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        await Camera.requestCameraPermission();
        await tf.ready();
        // const modelJson = require('./assets/models/model.json');
        // const modelWeights = require('./assets/models/group1-shard1of1.bin');
        const modelJson = 'file:///android_asset/model/yolov8_tfjs_model/model.json';
        const loadedModel = await tf.loadGraphModel(modelJson);
        console.log('loadedModel', loadedModel)
        setModel(loadedModel);
        console.log('yolo model loaded')
      } catch (error) {
        console.log('err during model loading', error)
      }
      // try {
      //   await Camera.requestCameraPermission();
      //   await tf.ready();

      //   const modelJson = require('./assets/model/yolov8_tfjs_model/model.json');
      //   const modelWeights = [
      //     require('./assets/model/yolov8_tfjs_model/group1-shard1of4.bin'),
      //     require('./assets/model/yolov8_tfjs_model/group1-shard2of4.bin'),
      //     require('./assets/model/yolov8_tfjs_model/group1-shard3of4.bin'),
      //     require('./assets/model/yolov8_tfjs_model/group1-shard4of4.bin'),
      //   ];
      //   console.log('Model JSON:', modelJson);
      //   console.log('Model Weights:', modelWeights)
      //   const loadedModel = await tf.loadGraphModel(bundleResourceIO(modelJson, modelWeights));
      //   setModel(loadedModel);
      //   console.log('YOLO model loaded');
      // } catch (error) {
      //   console.log('Error during model loading:', error);
      // }

    })();
  }, []);

  const imageToTensor = (frame: any) => {
    const { width, height, data } = frame;
    const buffer = new Uint8Array(data);
    const imgTensor = tf.tensor3d(buffer, [height, width, 3], 'int32');
    return tf.image.resizeBilinear(imgTensor, [640, 640]).expandDims(0).div(255.0);
  };

  const runDetection = async (frame: any) => {
    if (!model || processingRef.current) return;
    processingRef.current = true;
    const imgTensor = imageToTensor(frame);
    const output = await model.executeAsync(imgTensor);
    const boxes = output[0].arraySync();
    const scores = output[1].arraySync();
    const classes = output[2].arraySync();
    const detected: any = [];
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > 0.4) {
        detected.push({
          x: boxes[i][1] * frame.width,
          y: boxes[i][0] * frame.height,
          width: (boxes[i][3] - boxes[i][1]) * frame.width,
          height: (boxes[i][2] - boxes[i][0]) * frame.height,
          score: scores[i],
          label: cocoLabels[classes[i]]
        });
      }
    }
    setPredictions(detected);
    tf.dispose([imgTensor, output]);
    processingRef.current = false;
  };

  useEffect(() => {
    if (!model) return;
    const interval = setInterval(() => {
      captureAndDetect();
    }, 1000);
    return () => clearInterval(interval);
  }, [model]);
  const captureAndDetect = async () => {
    if (!camera.current || !model) return;

    try {
      const photo = await camera.current.takePhoto();
      const imagePath = `file://${photo.path}`;
      const imageBuffer = await RNFS.readFile(imagePath, 'base64');
      const rawImageData = Buffer.from(imageBuffer, 'base64');
      const imageTensor = decodeJpeg(rawImageData);
      const expanded = tf.expandDims(imageTensor, 0);

      const output: any = await model.executeAsync(expanded);
      const boxes = output[0].arraySync();
      const scores = output[1].arraySync();
      const classes = output[2].arraySync();

      const threshold = 0.5;
      const results = [];

      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > threshold) {
          const [ymin, xmin, ymax, xmax] = boxes[i];
          results.push({
            x: xmin,
            y: ymin,
            width: xmax - xmin,
            height: ymax - ymin,
            label: cocoLabels[classes[i]],
            score: scores[i],
          });
        }
      }

      setPredictions(results);
      tf.dispose([expanded, imageTensor, ...output]);
    } catch (err) {
      console.error('Detection error:', err);
    }
  };

  if (!device || !model) return <Text>{!device && 'device not found'} {!model && 'model not found'}</Text>;





  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 1 1"
        preserveAspectRatio="xMidYMid slice"
      >
        {predictions.map((item: any, idx: any) => (
          <React.Fragment key={idx}>
            <Rect
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              stroke="red"
              strokeWidth="0.005"
              fill="transparent"
            />
            <SvgText
              x={item.x}
              y={Math.max(0.02, item.y - 0.01)}
              fill="red"
              fontSize="0.03"
            >
              {item.label} ({(item.score * 100).toFixed(1)}%)
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
  // return (
  //   <SafeAreaView style={styles.container}>
  //     <StatusBar barStyle="light-content" backgroundColor="black" />
  //     {/* <ObjectDetectionCamera /> */}
  //     <View style={styles.container}>
  //       <Camera
  //         style={StyleSheet.absoluteFill}
  //         device={device}
  //         isActive={true}
  //         onFrame={runDetection}
  //       />
  //       <Svg style={StyleSheet.absoluteFill}>
  //         {predictions.map((p: any, index: any) => (
  //           <React.Fragment key={index}>
  //             <Rect
  //               x={p.x}
  //               y={p.y}
  //               width={p.width}
  //               height={p.height}
  //               stroke="red"
  //               strokeWidth="2"
  //               fill="transparent"
  //             />
  //             <SvgText
  //               x={p.x}
  //               y={p.y - 5}
  //               fill="red"
  //               fontSize="14"
  //             >
  //               {p.label} ({Math.round(p.score * 100)}%)
  //             </SvgText>
  //           </React.Fragment>
  //         ))}
  //       </Svg>
  //     </View>
  //   </SafeAreaView>
  // );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default App;
