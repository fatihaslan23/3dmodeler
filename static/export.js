function mirrorImage(ctx, image, x = 0, y = 0, horizontal = false, vertical = false) {
    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    newCanvas.width = 800;
    newCanvas.height = 800;

    var max = image.width > image.height ? image.width : image.height;
    var ratio = 750 / max;
    context.scale(ratio, ratio);
    var transX = (800 / ratio - image.width) / 2;
    var transY = (800 / ratio - image.height) / 2;
    context.translate(transX, transY);

    context.drawImage(image, 0, 0);

    image.width = 800;
    image.height = 800;

    ctx.setTransform(
        horizontal ? -1 : 1, 0, // set the direction of x axis
        0, vertical ? -1 : 1,   // set the direction of y axis
        x + horizontal ? image.width : 0, // set the x origin
        y + vertical ? image.height : 0   // set the y origin
    );
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(newCanvas, 0, 0);
}

function trim(c, r) {
    var ctx = r.context,
        copy = document.createElement('canvas').getContext('2d'),
        width = ctx.drawingBufferWidth,
        height = ctx.drawingBufferHeight,
        pixels = new Uint8Array(width * height * 4);
    ctx.readPixels(0, 0, width, height, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
    var l = pixels.length,
        i,
        bound = {
            top: null,
            left: null,
            right: null,
            bottom: null
        },
        x, y;

    for (i = 0; i < l; i += 4) {
        if (pixels[i+3] !== 0) {
            x = (i / 4) % c.width;
            y = ~~((i / 4) / c.width);

            if (bound.top === null) {
                bound.top = y;
            }

            if (bound.left === null) {
                bound.left = x;
            } else if (x < bound.left) {
                bound.left = x;
            }

            if (bound.right === null) {
                bound.right = x;
            } else if (bound.right < x) {
                bound.right = x;
            }

            if (bound.bottom === null) {
                bound.bottom = y;
            } else if (bound.bottom < y) {
                bound.bottom = y;
            }
        }
    }

    var trimHeight = bound.bottom - bound.top,
        trimWidth = bound.right - bound.left,
        trimmed = new Uint8Array(trimWidth * trimHeight * 4);
        ctx.readPixels(bound.left, bound.top, trimWidth, trimHeight, ctx.RGBA, ctx.UNSIGNED_BYTE, trimmed);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    trimmed = new Uint8ClampedArray(trimmed);
    var data = new ImageData(trimmed, copy.canvas.width, copy.canvas.height);
    copy.putImageData(data, 0, 0);

    mirrorImage(copy, copy.canvas, 0, 0, false, true);

    return copy.canvas;
}
