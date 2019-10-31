import store from '../store';
import * as d3 from 'd3';

var drawSegmentationMap = function (dimensions) {
  'use strict';
  let ringData = store.state.currentRingData;
  const dimX = dimensions['x'] + 1;
  const dimY = dimensions['y'] + 1;
  let uInt8IndexSample = {};
  let offsetX = 0;
  let offsetY = 0;
  const zoomIn = 1.1;
  const zoomOut = 1 / zoomIn;
  const backGroundcolor = [64, 64, 64, 255];
  const backGroundColorRGBA = 'rgba(64,64,64,255)';
  let scalor = 1;
  let defaultScalor;
  let first = true;
  let outside = Boolean;
  let outsideOnce = false;
  let selectedPrototype;
  let zoomCounter = 0;

  Object.keys(ringData).forEach(function (prototype) {
    let pixels = ringData[prototype]['pixels'];
    let colorString = ringData[prototype]['color'];
    let colorsOnly = colorString.substring(colorString.indexOf('(') + 1, colorString.lastIndexOf(')')).split(/,\s*/);
    let colors = [];
    colorsOnly.forEach(function (value) {
      colors.push(parseInt(value));
    });
    let indizes = [];
    pixels.forEach(function (pixel) {
      let indize = indexAccess(pixel[0], pixel[1]);
      indizes.push(indize);
      pixel.push(indize);
    });
    let dict = {};
    dict['indizes'] = indizes;
    dict['color'] = colors;
    uInt8IndexSample[prototype] = dict;
  });
  const canvas = document.getElementById('segMap');
  let ctx = canvas.getContext('2d');
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  let imageData = ctx.createImageData(dimX, dimY);
  let data = imageData.data;
  Object.keys(uInt8IndexSample).forEach(function (prototype) {
    let sample = uInt8IndexSample[prototype]['indizes'];
    let color = uInt8IndexSample[prototype]['color'];
    sample.forEach(function (index) {
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    });
  });

  const defaultImageData = copyImageData(ctx, imageData);

  if (dimX >= dimY) {
    scalor = Math.floor(canvas.width / dimX);
    defaultScalor = scalor;
  } else {
    scalor = Math.floor(canvas.height / dimY);
    defaultScalor = scalor;
  }

  store.commit('SET_SCALOR', scalor);
  draw(imageData);
  canvas.addEventListener('mousemove', highlightPrototype, false);
  // canvas.addEventListener('wheel', zoom, false);
  const r = 1.5;
  d3.select(canvas).data([imageData]).call(d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (imageData) => zoomed(d3.event.transform, imageData)));

  function zoomed (transform, imageData) {
    console.log(transform);
    console.log(imageData);
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    
    draw(imageData)
    
    ctx.restore();
  }

  zoomed(d3.zoomIdentity);

  function highlightPrototype (e) {
    ctx.save();
    let mousePos = getMousePos(canvas, e);
    let currentColor = mousePos.col;
    outside = currentColor[0] === backGroundcolor[0] && currentColor[1] === backGroundcolor[1] &&
      currentColor[2] === backGroundcolor[2] && currentColor[3] === backGroundcolor[3];
    if (outside) {
      if (!outsideOnce) {
        outsideOnce = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // ctx.beginPath();
        // let defaultData = copyImageData(ctx, defaultImageData);
        store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', null);
        draw(defaultImageData);
        ctx.restore();
      }
    } else {
      outsideOnce = false;
      let posX = parseInt((mousePos.x / scalor) - offsetX);
      let posY = parseInt((mousePos.y / scalor) - offsetY);
      let posXY = [posX, posY];
      Object.keys(ringData).map((protoKey) => {
        ringData[protoKey].pixels.map((pixelXY) => {
          if (pixelXY[0] === posXY[0] && pixelXY[1] === posXY[1]) {
            let prototypeSample = uInt8IndexSample[protoKey]['indizes'];
            if (first) {
              selectedPrototype = protoKey;
              store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', selectedPrototype);
              first = false;
              prototypeSample.forEach(function (index) {
                data[index] = 255;
                data[index + 1] = 255;
                data[index + 2] = 255;
                data[index + 3] = 255;
              });
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              draw(defaultImageData);
              ctx.restore();
            }
            if (selectedPrototype !== protoKey) {
              selectedPrototype = protoKey;
              store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', selectedPrototype);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              // ctx.beginPath();
              let newImageData = copyImageData(ctx, defaultImageData);
              let newdata = newImageData.data;
              prototypeSample.forEach(function (index) {
                newdata[index] = 255;
                newdata[index + 1] = 255;
                newdata[index + 2] = 255;
                newdata[index + 3] = 255;
              });
              draw(newImageData);
              ctx.restore();
            }
          }
        });
      });
    }
  }

  function zoom (evt) {
    let pos = getMousePos(canvas, evt);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.beginPath();
    // let iD = copyImageData(ctx, defaultImageData);
    const delta = Math.sign(evt.deltaY);
    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (delta === -1) {
      if (zoomCounter !== 7) {
        ctx.scale(zoomIn, zoomIn);
        scalor = defaultScalor;
        zoomCounter += 1;
        scalor = scalor * (Math.pow(zoomIn, zoomCounter));
      }
    } else if (delta === 1) {
      if (zoomCounter !== -3) {
        ctx.scale(zoomOut, zoomOut);
        scalor = defaultScalor;
        zoomCounter -= 1;
        scalor = scalor * (Math.pow(zoomIn, zoomCounter));
      }
    }
    ctx.translate(-pos.x, -pos.y);

    draw(defaultImageData);
    ctx.restore();
  }

  function draw (givenImageData) {
    let newCanvas = document.createElement('canvas');
    newCanvas.width = givenImageData.width;
    newCanvas.height = givenImageData.height;
    newCanvas.getContext('2d').putImageData(givenImageData, 0, 0);
    //ctx.save();
    //ctx.scale(scalor, scalor);
    offsetX = (canvas.width - (newCanvas.width * scalor)) / 4;
    offsetY = (canvas.height - (newCanvas.height * scalor)) / 4;
    ctx.fillStyle = backGroundColorRGBA;
    //ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(newCanvas, offsetX, offsetY);
    //ctx.restore();
    newCanvas.remove();
  }

  function getMousePos (canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    let xCord = (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    let yCord = (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    let pixeldata = ctx.getImageData(xCord, yCord, 1, 1);
    let col = pixeldata.data;
    return {
      x: xCord,
      y: yCord,
      col: col
    };
  }

  function indexAccess (i, j) {
    const NUM_CHANNELS = 4;
    return j * dimX * NUM_CHANNELS + i * NUM_CHANNELS;
  }

  function copyImageData (ctx, src) {
    let dst = ctx.createImageData(src.width, src.height);
    dst.data.set(src.data);
    return dst;
  }
};

export { drawSegmentationMap };
