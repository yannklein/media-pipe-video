// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';

let poseLandmarker = undefined;
let runningMode = 'IMAGE';
let lastTime = -1;

const videoContainer = document.querySelector('.detectVideoOnClick');
const video = document.querySelector('.detectVideoOnClick video');
const stopButton = document.querySelector('.stop');
const startButton = document.querySelector('.start');
const canvas = document.querySelector('.canvas');
const detectionInterval = 0.05;

// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: 'GPU',
    },
    runningMode: runningMode,
    numPoses: 2,
  });
};

/**
 * Renders detected poses from a video stream onto a canvas element.
 *
 * This function creates a new canvas element, sets up the drawing context,
 * and uses the PoseLandmarker API to detect poses in the video stream.
 * The detected poses are then drawn onto the canvas using the DrawingUtils class.
 *
 * @return {Promise<void>} A promise that resolves when the pose detection is complete.
 */
const renderDetectedPoses = async () => {
  if (Math.abs(video.currentTime - lastTime) < detectionInterval) {
    return;
  }

  canvas.setAttribute('width', videoContainer.clientWidth + 'px');
  canvas.setAttribute('height', videoContainer.clientHeight + 'px');
  const canvasCtx = canvas.getContext('2d');
  const drawingUtils = new DrawingUtils(canvasCtx);

  // Now let's start detecting the stream.
  if (runningMode === 'IMAGE') {
    runningMode = 'VIDEO';
    await poseLandmarker.setOptions({ runningMode: 'VIDEO' });
  }
  let startTimeMs = performance.now();

  poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (const landmark of result.landmarks) {
      drawingUtils.drawLandmarks(landmark, {
        radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
      });
      drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
    }
    canvasCtx.restore();
  });
  lastTime = video.currentTime;
};

/**
 * Handles a video click event by setting up a pose landmarker and detecting video streams.
 *
 * @return {Promise<void>} A promise that resolves when the video click event has been handled.
 */
const handleStart = async () => {
  if (!poseLandmarker) {
    console.log('Wait for poseLandmarker to load before clicking!');
    return;
  }

  renderDetectedPoses();
  const interval = setInterval(renderDetectedPoses, detectionInterval);

  stopButton.addEventListener('click', async () => {
    document.querySelectorAll('.canvas').forEach((canva) => canva.remove());
    clearInterval(interval);
    lastTime = -1;
  });
};

/**
 * Initializes the pose detection functionality by creating a pose landmarker and setting up an event listener for the start button.
 *
 * @return {void}
 */
const runDetection = () => {
  createPoseLandmarker();
  startButton.addEventListener('click', handleStart);
};

runDetection();
