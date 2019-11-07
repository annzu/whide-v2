import store from '../store';
import * as d3 from 'd3';

var drawSegmentationMap = function (dimensions) {
  const ringData = store.state.currentRingData;
  const dimX = dimensions['x'] + 1;
  const dimY = dimensions['y'] + 1;
  let uInt8IndexSample = {};
  const backGroundcolor = [64, 64, 64, 255];
  const backGroundColorRGBA = 'rgba(64,64,64,255)';
  let scalor = 1;
  let selectedPrototype;
  let first = true;

  let colorIndex = 1;
  let colorDataDict = {};

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
      const colorOfIndex = getColor(colorIndex);
      colorIndex += 1;
      const colorOfIndexRGB = colorOfIndex.substring(colorOfIndex.indexOf('(') + 1, colorOfIndex.lastIndexOf(')')).split(/,\s*/);
      colorDataDict[colorOfIndex] = {
        'id': prototype,
        'indize': indize,
        'rgb': colorOfIndexRGB
      };
    });
    let dict = {};
    dict['indizes'] = indizes;
    dict['color'] = colors;
    uInt8IndexSample[prototype] = dict;
  });
  const canvas = document.getElementById('segMap');
  const virtCanvas = document.getElementById('virtCanvas');
  const regex = /[0-9]*\.?[0-9]+(px|%)?/i;
  const w = canvas.style.width.match(regex);
  const h = canvas.style.height.match(regex);
  const computedWidth = (w[0] * document.documentElement.clientWidth) / 100;
  const computedHeight = (h[0] * document.documentElement.clientHeight) / 100;
  canvas.width = computedWidth;
  canvas.height = computedHeight;
  virtCanvas.width = computedWidth;
  virtCanvas.height = computedHeight;

  const ctx = canvas.getContext('2d');
  const virtCtx = virtCanvas.getContext('2d');
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  virtCtx.webkitImageSmoothingEnabled = false;
  virtCtx.imageSmoothingEnabled = false;

  let imageData = ctx.createImageData(dimX, dimY);
  let data = imageData.data;
  let virtImageData = virtCtx.createImageData(dimX, dimY);
  let virtData = virtImageData.data;

  // color every pixel of every prototype for View
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
  firstDraw(imageData, ctx, true);

  // draw virtCanvas
  Object.keys(colorDataDict).forEach(function (pixel) {
    const dict = colorDataDict[pixel];
    virtData[dict.indize] = dict.rgb[0];
    virtData[dict.indize + 1] = dict.rgb[1];
    virtData[dict.indize + 2] = dict.rgb[2];
    virtData[dict.indize + 3] = 255;
  });
  firstDraw(virtImageData, virtCtx, false);

  const defaultImageData = copyImageData(ctx, imageData);

  if (dimX >= dimY) {
    scalor = Math.floor(canvas.width / dimX);
  } else {
    scalor = Math.floor(canvas.height / dimY);
  }

  // add highlight and zoom
  virtCanvas.addEventListener('mousemove', highlightPrototype, false);
  d3.select(virtCanvas).call(d3.zoom()
    .scaleExtent([0.3, 2])
    .on('zoom', () => zoomed(d3.event.transform)));

  function zoomed (transform) {
    // viewingCanvas
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    draw(imageData, ctx);
    ctx.restore();

    // virtuellCanvas
    virtCtx.save();
    virtCtx.clearRect(0, 0, virtCanvas.width, virtCanvas.height);
    virtCtx.translate(transform.x, transform.y);
    virtCtx.scale(transform.k, transform.k);
    draw(virtImageData, virtCtx);
    virtCtx.restore();
  }

  zoomed(d3.zoomIdentity);

  function highlightPrototype (e) {
    let mouse = getMousePos(virtCanvas, e);
    const imageDataMouse = virtCtx
      .getImageData(mouse.x, mouse.y, 1, 1);
    const mouseColor = d3.rgb.apply(null, imageDataMouse.data).toString();
    if (mouseColor !== 'rgba(0, 0, 0, 0)') {
      const mousePrototype = colorDataDict[mouseColor].id;
      let prototypeSample = uInt8IndexSample[mousePrototype]['indizes'];

      if (first) {
        selectedPrototype = mousePrototype;
        store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', selectedPrototype);
        first = false;
        ctx.save();
        prototypeSample.forEach(function (index) {
          data[index] = 255;
          data[index + 1] = 255;
          data[index + 2] = 255;
          data[index + 3] = 255;
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw(imageData, ctx);
        ctx.restore();
      }
      if (selectedPrototype !== mousePrototype) {
        selectedPrototype = mousePrototype;
        store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', selectedPrototype);
        setImagedataDefault();
        ctx.save();
        prototypeSample.forEach(function (index) {
          data[index] = 255;
          data[index + 1] = 255;
          data[index + 2] = 255;
          data[index + 3] = 255;
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw(imageData, ctx);
        ctx.restore();
      }
    } else {
      ctx.save();
      store.commit('SET_CURRENT_HIGHLIGHTED_PROTOTYPE', null);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setImagedataDefault();
      draw(imageData, ctx);
      ctx.restore();
    }
  }

  function draw (givenImageData, context) {
    let newCanvas = document.createElement('canvas');
    newCanvas.width = givenImageData.width;
    newCanvas.height = givenImageData.height;
    newCanvas.getContext('2d').putImageData(givenImageData, 0, 0);
    context.save();
    context.scale(scalor, scalor);
    // context.fillStyle = backGroundColorRGBA;
    // context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(newCanvas, 0, 0);
    context.restore();
    newCanvas.remove();
  }

  function firstDraw (givenImageData, context, visible) {
    let newCanvas = document.createElement('canvas');
    newCanvas.width = givenImageData.width;
    newCanvas.height = givenImageData.height;
    newCanvas.getContext('2d').putImageData(givenImageData, 0, 0);
    context.save();
    context.scale(scalor, scalor);
    if (visible) {
      context.fillStyle = backGroundColorRGBA;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(newCanvas, 0, 0);
    context.restore();
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

  function colorToHex (col) {
    var hex = Number(col).toString(16);
    if (hex.length < 2) {
      hex = '0' + hex;
    }
    return hex;
  }

  function fullColorToHex (r, g, b) {
    let red = colorToHex(r);
    let green = colorToHex(g);
    let blue = colorToHex(b);
    return red + green + blue;
  }

  function getColor (index) {
    return d3.rgb(
      (index & 0b111111110000000000000000) >> 16,
      (index & 0b000000001111111100000000) >> 8,
      (index & 0b000000000000000011111111))
      .toString();
  }
  function setImagedataDefault () {
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
  }
};
export { drawSegmentationMap };
