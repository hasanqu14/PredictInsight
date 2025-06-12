const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const labelCounter = document.getElementById('label-counter');

let lastSpoken = new Set();

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise(resolve => {
      video.onloadedmetadata = () => resolve(video);
    });
  } catch (err) {
    alert("Webcam not accessible. Please allow permission.");
    console.error(err);
  }
}

function speakLabels(labels) {
  const labelString = labels.join(', ');
  const utterance = new SpeechSynthesisUtterance(`Detected: ${labelString}`);
  speechSynthesis.speak(utterance);
}

async function runDetection() {
  await setupCamera();
  await video.play();

  const model = await cocoSsd.load();
  console.log("✅ Model loaded");

  async function detectFrame() {
    const predictions = await model.detect(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detectedLabels = new Set();

    predictions.forEach(pred => {
      const [x, y, width, height] = pred.bbox;
      const label = `${pred.class} (${Math.round(pred.score * 100)}%)`;

      // Draw bounding box
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "lime";
      ctx.stroke();

      // Draw label
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "lime";
      ctx.fillText(label, x, y > 20 ? y - 5 : y + 15);

      detectedLabels.add(pred.class);
    });

    // Convert to array and update UI
    const labelArray = Array.from(detectedLabels);
    labelCounter.textContent = `Detected (${labelArray.length}): ${labelArray.join(', ')}`;

    // Speak labels if changed
    const newLabels = labelArray.filter(label => !lastSpoken.has(label));
    if (newLabels.length > 0) {
      speakLabels(newLabels);
      lastSpoken = new Set(labelArray);
    }

    requestAnimationFrame(detectFrame);
  }

  detectFrame();
}

runDetection();
