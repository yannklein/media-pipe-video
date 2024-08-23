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
 * Handles a video click event by setting up a pose landmarker and detecting video streams.
 *
 * @return {Promise<void>} A promise that resolves when the video click event has been handled.
 */
const handleVideoClick = async () => {
  const videoContainer = document.querySelector('.detectVideoOnClick');
  const video = document.querySelector('.detectVideoOnClick video');
  if (!poseLandmarker) {
    console.log('Wait for poseLandmarker to load before clicking!');
    return;
  }

  const interval = setInterval(async () => {
    document.querySelectorAll('.canvas').forEach((canva) => canva.remove());
    const canvas = document.createElement('canvas');
    canvas.setAttribute('class', 'canvas');
    canvas.setAttribute('width', videoContainer.clientWidth + 'px');
    canvas.setAttribute('height', videoContainer.clientHeight + 'px');
    canvas.style =
      'left: 0px;' +
      'top: 0px;' +
      'width: ' +
      videoContainer.clientWidth +
      'px;' +
      'height: ' +
      videoContainer.clientHeight +
      'px;';

    videoContainer.appendChild(canvas);
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
  }, 100);

  document.querySelector('.start').removeEventListener('click', handleVideoClick);
  document.querySelector('.start').addEventListener('click', async () =>  {
    document.querySelectorAll('.canvas').forEach((canva) => canva.remove());
    clearInterval(interval)
  });
}

/**
 * Initializes the pose detection functionality by creating a pose landmarker and setting up an event listener for the start button.
 *
 * @return {void}
 */
const runDetection = () => {
  createPoseLandmarker();
  document.querySelector('.start').addEventListener('click', handleVideoClick);
}

runDetection();