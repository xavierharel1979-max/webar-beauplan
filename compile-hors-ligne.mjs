import fs from 'fs';
import { CompilerBase } from 'mind-ar/src/image-target/compiler-base.js';
import { buildTrackingImageList } from 'mind-ar/src/image-target/image-list.js';
import { extractTrackingFeatures } from 'mind-ar/src/image-target/tracker/extract-utils.js';
import 'mind-ar/src/image-target/detector/kernels/cpu/index.js';

const WIDTH = 1079;
const HEIGHT = 810;
const rgba = new Uint8Array(fs.readFileSync('target.rgba'));

// Stub canvas so we never touch the native `canvas` package.
class NodeCompiler extends CompilerBase {
  createProcessCanvas(img) {
    return {
      getContext: () => ({
        drawImage: () => {},
        getImageData: () => ({ data: rgba, width: WIDTH, height: HEIGHT }),
      }),
    };
  }
  compileTrack({ progressCallback, targetImages, basePercent }) {
    return new Promise((resolve) => {
      const list = [];
      for (const targetImage of targetImages) {
        const imageList = buildTrackingImageList(targetImage);
        list.push(extractTrackingFeatures(imageList, () => {}));
      }
      resolve(list);
    });
  }
}

const compiler = new NodeCompiler();
const fakeImg = { width: WIDTH, height: HEIGHT };

console.log('compiling...');
const data = await compiler.compileImageTargets([fakeImg], (p) => {
  if (Math.round(p) % 20 === 0) process.stdout.write(`${Math.round(p)}% `);
});
console.log('\ndone');

// Trackability report
let totalMatch = 0;
data[0].matchingData.forEach((kf, i) => {
  const n = kf.maximaPoints.length + kf.minimaPoints.length;
  totalMatch += n;
  console.log(`  keyframe ${i}: ${kf.width}x${kf.height} scale=${kf.scale.toFixed(3)} -> ${n} keypoints`);
});
console.log(`TOTAL matching keypoints: ${totalMatch}`);
let totalTrack = 0;
data[0].trackingData.forEach((t, i) => {
  console.log(`  tracking level ${i}: ${t.width}x${t.height} -> ${t.points.length} points`);
  totalTrack += t.points.length;
});
console.log(`TOTAL tracking points: ${totalTrack}`);

fs.writeFileSync('targets.mind', compiler.exportData());
console.log('written targets.mind', fs.statSync('targets.mind').size, 'bytes');
