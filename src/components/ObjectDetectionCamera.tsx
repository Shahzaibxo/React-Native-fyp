import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
  Frame,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import RealFrameProcessor, { ModelPrediction } from '../utils/RealFrameProcessor';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ObjectDetectionCamera: React.FC = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detections, setDetections] = useState<ModelPrediction[]>([]);
  const frameProcessorRef = useRef<RealFrameProcessor | null>(null);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  useEffect(() => {
    requestPermissions();
    initializeProcessor();
    
    return () => {
      if (frameProcessorRef.current) {
        frameProcessorRef.current.dispose();
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera for object detection',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const cameraPermission = await Camera.requestCameraPermission();
        setHasPermission(cameraPermission === 'granted');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setHasPermission(false);
    }
  };

  const initializeProcessor = async () => {
    try {
      setIsModelLoading(true);
      
      console.log('Initializing real YOLOv8 object detection...');
      frameProcessorRef.current = new RealFrameProcessor();
      const success = await frameProcessorRef.current.initialize();
      
      if (success) {
        console.log('Real object detection initialized successfully - NO SIMULATION');
      } else {
        console.error('Failed to initialize real object detection');
        Alert.alert('Model Loading Failed', 'Could not load the YOLOv8 TensorFlow Lite model. Make sure the model file is in the correct location.');
      }
      
      setIsModelLoading(false);
    } catch (error) {
      console.error('Failed to initialize real object detection:', error);
      Alert.alert('Initialization Failed', 'Could not initialize real object detection: ' + String(error));
      setIsModelLoading(false);
    }
  };

  const processDetections = useCallback((newDetections: ModelPrediction[]) => {
    setDetections(newDetections);
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      
      if (frameProcessorRef.current && frameProcessorRef.current.isReady()) {
        // Process real camera frame with YOLOv8 TensorFlow Lite - NO SIMULATION
        frameProcessorRef.current
          .processFrame(frame)
          .then((realDetections) => {
            // Only update if we have real detections from the model
            runOnJS(processDetections)(realDetections);
          })
          .catch((error) => {
            console.error('Real frame processing error:', error);
          });
      }
    },
    [processDetections]
  );

  const renderBoundingBox = (detection: ModelPrediction, index: number) => {
    const [x, y, width, height] = detection.bbox;
    
    return (
      <View
        key={index}
        style={[
          styles.boundingBox,
          {
            left: x,
            top: y,
            width: width,
            height: height,
          },
        ]}
      >
        <Text style={styles.detectionLabel}>
          {detection.class} ({Math.round(detection.score * 100)}%)
        </Text>
      </View>
    );
  };

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Camera permission is required</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  if (isModelLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading Real YOLOv8 Model...</Text>
        <Text style={styles.statusText}>No simulation - using actual TensorFlow Lite model</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      
      {/* Detection overlay */}
      <View style={styles.overlay}>
        {detections.map((detection, index) => renderBoundingBox(detection, index))}
      </View>
      
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Real YOLOv8 Detection: {detections.length} objects
        </Text>
        <Text style={styles.statusSubText}>
          TensorFlow Lite • No Simulation
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
  },
  detectionLabel: {
    position: 'absolute',
    top: -25,
    left: 0,
    backgroundColor: '#00ff00',
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  statusSubText: {
    color: '#00ff00',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default ObjectDetectionCamera;