import { useEffect, useRef, useState } from "react";
import "./App.css";
// @tensorflow-models/knn-classifier howler
// @tensorflow/tfjs
// @tensorflow-models/mobilenet
// @tensorflow-models/knn-classifier
import { Howl } from "howler";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import * as knn from "@tensorflow-models/knn-classifier";
import soundUrl from "./assets/alert2.mp3";
import { initNotifications, notify } from "@mycv/f8-notification";
import { Button } from "antd";
var sound = new Howl({
  src: [soundUrl],
});

function App() {
  const userVideo = useRef();
  const classifier = useRef();
  const [load, setLoad] = useState("");
  const mobilenet_module = useRef();
  const [canPlaySound, setPlaySound] = useState(true);
  const [touch, setTouch] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const init = async () => {
    setLoad("init...");
    await setUpCam();
    setLoad("setup camera done");
    //setup
    classifier.current = knn.create();
    mobilenet_module.current = await mobilenet.load();
    //done setup
    setLoad("setup done");
    setLoad("Don't touch your face and click Train 1");
    setShowBtn(true);
    initNotifications({ cooldown: 3000 });
  };
  const setUpCam = () => {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia =
        navigator.mediaDevices.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((result) => {
            //result stand for *** navigator.mediaDevices.getUserMedia({ video: true }) ***
            console.log(result);
            userVideo.current.srcObject = result;
            userVideo.current.addEventListener("loadeddata", () => {
              resolve(); // Ensure resolve is called in the correct context
            });
          })
          .catch((error) => {
            reject(error); // Handle promise rejection
          });
      } else {
        reject(new Error("not supported"));
      }
    });
  };
  const NOT_TOUCH_LABEL = "no_touch";
  const TOUCHED_LABEL = "touch";
  const TRAINING_TIME = 50;
  const handleTraining = (label) => {
    return new Promise((resolve) => {
      const embedding = mobilenet_module.current.infer(userVideo.current, true);
      classifier.current.addExample(embedding, label);
      wait(100).then(resolve); // Wait for 100ms before resolving
    });
  };
  const handleTrain = async (label) => {
    console.log(`${label}: traing your machine...`);
    for (let i = 0; i < TRAINING_TIME; ++i) {
      // console.log(`Progress ${parseInt(((i + 1) / TRAINING_TIME) * 100)}%`);
      setLoad(`Progress ${parseInt(((i + 1) / TRAINING_TIME) * 100)}%`);
      await handleTraining(label);
    }
  };

  const run = async () => {
    const embedding = mobilenet_module.current.infer(userVideo.current, true);
    const response = await classifier.current.predictClass(embedding);
    if (response.label === NOT_TOUCH_LABEL) {
      console.log(response.label);
      setTouch(false);
    } else if (response.label === TOUCHED_LABEL) {
      console.log(response.label);
      setTouch(true);
      if (canPlaySound) {
        setPlaySound(false);
        sound.play();
      }

      notify("Get your hand off your face!!!", {
        body: "You did touch your face",
      });
    }
    await wait(200);
    run();
  };

  const wait = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  useEffect(() => {
    init();
    sound.on("end", function () {
      setPlaySound(true);
    });
  }, []);
  return (
    <div className={`main ${touch ? "touch" : ""}`}>
      <video ref={userVideo} className="video" autoPlay></video>
      <div className={`control ${showBtn ? "show" : ""}`}>
        <Button
          className="btn"
          onClick={() => {
            handleTrain(NOT_TOUCH_LABEL);
          }}
        >
          Train 1
        </Button>
        <Button
          className="btn"
          onClick={() => {
            handleTrain(TOUCHED_LABEL);
          }}
        >
          Train 2
        </Button>
        <Button
          className="btn"
          onClick={() => {
            run();
          }}
        >
          Run
        </Button>
      </div>
      <h2>{load}</h2>
    </div>
  );
}

export default App;
