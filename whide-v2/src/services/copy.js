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
  let transformX = 0;
  let transformY = 0;
  let mousePos = { x: 0, y: 0, col: 0 };

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
  d3.select(canvas).data([imageData]).call(d3.zoom()
    .scaleExtent([0.7, 3])
    .on('zoom', () => zoomed(d3.event.transform)));

  function zoomed (transform) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.x, transform.y);
    // ctx.translate(mousePos.x , mousePos.y + transform.y);
    ctx.scale(transform.k, transform.k);
    ctx.beginPath();
    /* transformX = transform.x;
    transformY = transform.y;
    scalor = defaultScalor;
    scalor = scalor * transform.k;

     */
    ctx.moveTo(50, 70);
    ctx.arc(50, 70, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  zoomed(d3.zoomIdentity);

  function highlightPrototype (e) {
    // ctx.save();
    let mousePos = getMousePos(canvas, e);
    let posX = parseInt((mousePos.x / scalor));
    let posY = parseInt((mousePos.y / scalor));
    // console.log(posX);
    // console.log(posY);
    ctx.fillStyle = 'red';
    ctx.fillRect(posX, posY, 1, 1);

    let currentColor = mousePos.col;
    outside = currentColor[0] === backGroundcolor[0] && currentColor[1] === backGroundcolor[1] &&
      currentColor[2] === backGroundcolor[2] && currentColor[3] === backGroundcolor[3];
    if (outside) {
      if (!outsideOnce) {
        outsideOnce = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', null);
        draw(defaultImageData, ctx);
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 10, 10);
      ctx.fillStyle = 'blue';
      ctx.fill();
      ctx.restore();
      outsideOnce = false;
      // let posX = parseInt((mousePos.x / scalor) - transformX);
      // let posY = parseInt((mousePos.y / scalor) - transformY);
      let posXY = [posX, posY];
      Object.keys(ringData).map((protoKey) => {
        ringData[protoKey].pixels.map((pixelXY) => {
          if (pixelXY[0] === posXY[0] && pixelXY[1] === posXY[1]) {
            ctx.fillStyle = 'green';
            ctx.fillRect(posXY[0], posXY[1], 4, 4);
            /* let prototypeSample = uInt8IndexSample[protoKey]['indizes'];
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
              draw(defaultImageData, false);
              ctx.restore();
            }
            if (selectedPrototype !== protoKey) {
              selectedPrototype = protoKey;
              store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', selectedPrototype);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
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

             */
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
    /* let newCanvas = document.createElement('canvas');
    newCanvas.width = givenImageData.width;
    newCanvas.height = givenImageData.height;
    newCanvas.getContext('2d').putImageData(givenImageData, 0, 0);
    ctx.save();
    ctx.scale(scalor, scalor);
    // console.log(scalor);
    // offsetX = (canvas.width - (newCanvas.width * scalor)) / 4;
    // offsetY = (canvas.height - (newCanvas.height * scalor)) / 4;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(newCanvas, 0, 0);
    // ctx.drawImage(, 0, 0);
    ctx.restore();
    newCanvas.remove();

     */
    ctx.moveTo(50, 70);
    ctx.arc(50, 70, 10, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawDefault (givenImageData, transformX, transformY) {
    let newCanvas = document.createElement('canvas');
    newCanvas.width = givenImageData.width;
    newCanvas.height = givenImageData.height;
    newCanvas.getContext('2d').putImageData(givenImageData, 0, 0);
    ctx.save();
    ctx.scale(scalor, scalor);
    ctx.translate(transformX, transformY);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(newCanvas, transformX, transformY);
    ctx.drawImage(newCanvas, transformX, transformX);
    ctx.restore();
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
