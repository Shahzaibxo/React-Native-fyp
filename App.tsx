/**
 * Object Detection React Native App
 * Uses React Native Vision Camera and YOLOv8 for real-time object detection
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, View, SafeAreaView } from 'react-native';
import ObjectDetectionCamera from './src/components/ObjectDetectionCamera';

function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <ObjectDetectionCamera />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
