var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(20, 1, 0.1, 1000);

var canvas = document.getElementById('canvas');

var renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true, alpha: true } );
renderer.setSize(800, 800);

scene.background = new THREE.Color( 0xffffff );

var controls = new THREE.OrbitControls( camera, canvas );
controls.enableRotate = true;
controls.autoRotate = true;

var spheres = [];
var grid = [];

var form = 0;

function addSwellSphere(x, y, z, r) {
    spheres.push({'center': new THREE.Vector3(x, y, z), 'radius' : r});
}

function swellFunction(v, inner, thickness) {
    for (let i = 0; i < spheres.length; i++) {
        let dist = v.distanceTo(spheres[i].center);
        let radius = spheres[i].radius;
        if (!inner)
            radius += thickness;
        if (dist < radius) {
            let delta = v.clone().sub(spheres[i].center);
            //delta.multiplyScalar(1 - dist / spheres[i].radius);
            delta.multiplyScalar(radius / dist - 1);
            v.add(delta);
        }
    }
}

function voronoiFunction() {
    grid = [];
    for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
            //grid.push(new THREE.Vector2(16*i+getRandomArbitrary(-4, 4), 12*j+getRandomArbitrary(-3, 3)));
            grid.push([8*i+getRandomArbitrary(-4, 4), 6*j+getRandomArbitrary(-3, 3)]);
        }
    }
}

function voronoi(dparam, dscale) {
    let scaleX = window.width / 12.5;
    let scaleY = window.height / 60;

    const voronoi = d3.voronoi()
        .extent([[0, 0], [80, 60]]);

    let shapes = [];

    const drawCell = (cell) => {
      let shape = new THREE.Shape();

      shape.moveTo(scaleX*cell[0][0], scaleY*cell[0][1]);
      cell.forEach((point) => {
          shape.lineTo(scaleX*point[0], scaleY*point[1]);
      });

      shapes.push(shape);
    };

    const scalePolygon = (polygon) => {
        let center = [0, 0];
        polygon.forEach((point) => {
            center[0] += point[0];
            center[1] += point[1];
        });
        center[0] /= polygon.length;
        center[1] /= polygon.length;
        polygon.forEach((point) => {
            point[0] = point[0] + dparam*(center[0] - point[0]);
            point[1] = point[1] + 0.25*(center[1] - point[1]);
        })
    };


    const draw = () => {
      const diagram = voronoi(grid);
      const polygons = diagram.polygons();

      polygons.forEach((polygon, i) => {
          scalePolygon(polygon);
          drawCell(polygon);
      })
    };

    draw();

    let extrudeSettings = {
        steps: 1,
        depth: dscale,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 2
    };

    let geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);

    pattern = geometry;
}

function knitting(dparam, dscale, hsegments, vsegments, height, width) {
    let geometry = new THREE.Geometry();

    let k = 2*Math.PI*width;

    for (let i = 0; i < hsegments; i++) {
        let shape = new THREE.BoxGeometry( dparam, height, dscale, 1, vsegments );
        let x = k*(i/hsegments);
        shape.translate(x, height/2, dscale/2);
        //shape.scale(1, 10, 1);
        geometry.merge(shape);
    }

    for (let i = 0; i < vsegments; i++) {
        let shape = new THREE.BoxGeometry( k, 0.6*dparam, dscale, hsegments, 1 );
        let y = (i/vsegments)*height;
        if (y + 0.6 >= height)
            continue;
        shape.translate(0, 0.5+y, dscale/2);
        geometry.merge(shape);
    }

    pattern = geometry;
}

var handle, handleGeometry;
var handle1, handle2, handle3;
var handleWidth = 0.3;

function drawHandle() {
    if (handle !== undefined)
        scene.remove(handle);

    let curve = new THREE.QuadraticBezierCurve3(
        handlePos1,
        handlePos2,
        handlePos3
    );

    let geometry = new THREE.TubeGeometry( curve, 100, handleWidth, 16, false );

    let shape = new THREE.Shape();
    let point = curve.getPoint(0);
    shape.moveTo(point.x, point.y);
    for (let t = 0; t <= 1.05; t += 0.05) {
        point = curve.getPoint(t);
        shape.lineTo(point.x, point.y);
    }

    for (let i = handlePos3.y; i >= handlePos1.y; i -= 0.1) {
        x = fingerprint[Math.round(100/height*i)];
        shape.lineTo(x, i);
    }

    let extrudeSettings = {
        steps: 1,
        depth: handleWidth,
        bevelEnabled: false
    };

    let fill = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    fill.translate(0, 0, -handleWidth/2);
    geometry.merge(fill);

    handleGeometry = geometry.clone();
    geometry.translate(0, -height/2, 0);
    geometry.scale(normalizationRatio, normalizationRatio, normalizationRatio);
    let material = new THREE.MeshLambertMaterial( { color: 0x270202, emissive: 0x370202, side: THREE.DoubleSide, flatShading: true } );
    let mesh = new THREE.Mesh( geometry, material );
    handle = mesh;
    scene.add( mesh );
}

var dragControls;
var handlePos1, handlePos2, handlePos3;

function normalize(vector) {
    let vec = vector.clone();
    vec.y -= height/2;
    return vec.multiplyScalar(normalizationRatio);
}

function denormalize(vector) {
    let vec = vector.clone();
    vec.multiplyScalar(1 / normalizationRatio);
    vec.y += height/2;
    return vec;
}

function dragHandle(denorm) {
    handlePos1.z = 0;
    handlePos2.z = 0;
    handlePos3.z = 0;
    if (denorm) {
        handlePos1.y = denormalize(handle1.position).y;
        handlePos2.x = denormalize(handle2.position).x;
        handlePos2.y = denormalize(handle2.position).y;
        handlePos3.y = denormalize(handle3.position).y;
    }
    if (handlePos1.y <= 0)
        handlePos1.y = 0;
    if (handlePos1.y >= height)
        handlePos1.y = height;
    let index = Math.round(100/height*handlePos1.y);
    handlePos1.x = fingerprint[index];
    if (handlePos3.y <= 0)
        handlePos3.y = 0;
    if (handlePos3.y >= height)
        handlePos3.y = height;
    index = Math.round(100/height*handlePos3.y);
    handlePos3.x = fingerprint[index];

    handle1.position.set(normalize(handlePos1).x, normalize(handlePos1).y, normalize(handlePos1).z);
    handle2.position.set(normalize(handlePos2).x, normalize(handlePos2).y, normalize(handlePos2).z);
    handle3.position.set(normalize(handlePos3).x, normalize(handlePos3).y, normalize(handlePos3).z);
    drawHandle();
}

function activateHandle() {
    let objects = [];

    for (let i = 0; i < 3; i++) {
        let objGeometry = new THREE.SphereGeometry(1, 24, 24);
        let mat = new THREE.MeshPhongMaterial({color: 0.5 * i * 0xffffff});
        mat.depthTest = false;
        let object = new THREE.Mesh(objGeometry, mat);
        let radius = 0.04;
        object.scale.x = radius;
        object.scale.y = radius;
        object.scale.z = radius;
        objects.push(object);
        this.scene.add(object);
        if (i === 0) {
            handlePos1 = new THREE.Vector3(0, 0.2*height, 0);
            handle1 = object;
        }
        if (i === 1) {
            handlePos2 = new THREE.Vector3(0.7*height, 0.5*height, 0);
            handle2 = object;
        }
        if (i === 2) {
            handlePos3 = new THREE.Vector3(0, 0.8*height, 0);
            handle3 = object;
        }
    }

    dragControls = new THREE.DragControls( objects, camera, canvas );

    dragControls.addEventListener( 'dragstart', function () {
        controls.enabled = false;
    });

    function drag(denorm) {
        dragHandle(denorm);
    }

    dragControls.addEventListener( 'drag', function () {
        drag(true);
    });

    dragControls.addEventListener( 'dragend', function () {
        controls.enabled = true;
        change();
    });

    drag(false);
}

function deactivateHandle() {
    scene.remove(handle1);
    scene.remove(handle2);
    scene.remove(handle3);
    dragControls.enabled = false;
    scene.remove(handle);
    handle = undefined;
}

var fingerprint = [];
var normalizationRatio;

function createVase(hsegments, vsegments, width, height, thickness, A, B, C, D, E, F, G, delta, translation, twist, decorations, bottom, extrusion, eheight, eposition, rwaving, swaving, normalize) {
    let indexOffset = 0;
    let geometry = new THREE.Geometry();
    let decorationsGeometry = new THREE.Geometry();

    let dparam = 0;
    let dscale = 0;

    let ydparam = 0;
    let ydscale = 0;

    function swell(dparam, dscale) {
        /*for (let i = 0; i < 150; i++) {
            let r = getRandomArbitrary(2, 2.5);
            let y = getRandomArbitrary(0, 10);
            let angle = getRandomArbitrary(0, 2*Math.PI);
            let x = Math.cos(angle);
            let z = Math.sin(angle);
            addSwellSphere(x, y, z, r);
        }*/
        /*for (let i = 1; i < 11; i += 2) {
            for (let j = 0; j < 2*Math.PI; j += Math.PI/4) {
                let x = 2*Math.cos(j);
                let z = 2*Math.sin(j);
                addSwellSphere(x, i, z, 1);
            }
        }*/
        let offset = calcThickess(thickness);
        let step = 2/dparam;
        if (dparam === 2) {
            for (let i = 1; i <= height; i += 2) {
                let curve = 0.25+curveSum(i);
                let td = (i*twist + swaving*Math.sin(rwaving*i))/(height/10);
                for (let j = 0; j < 2*Math.PI; j += Math.PI/4) {
                    let x = width*curve*Math.cos(j+td) - 1.5*offset*Math.cos(j+td);
                    let z = width*curve*Math.sin(j+td) - 1.5*offset*Math.sin(j+td);
                    addSwellSphere(x, i, z, dscale);
                }
            }
        }
        else {
            if (dparam === 3)
                step = 1;
            for (let i = 0; i <= height; i += step) {
                let curve = 0.25+curveSum(i);
                let td = (i*twist + swaving*Math.sin(rwaving*i))/(height/10);
                for (let j = 0; j < 2*Math.PI; j += Math.PI/4) {
                    let angle = j;
                    if (i % (2*step) === 0)
                        angle += Math.PI/8;
                    let x = width*curve*Math.cos(angle+td) - 1.5*offset*Math.cos(angle+td);
                    let z = width*curve*Math.sin(angle+td) - 1.5*offset*Math.sin(angle+td);
                    addSwellSphere(x, i, z, dscale);
                }
            }
        }
    }

    function ball(dparam, dscale) {
        addSwellSphere(0, dparam, 0, dscale);
    }

    /*function knotsDecorationFunction() {
        let vsegments = 24;
        let hsegments = 12;
        for(let i = 0; i < vsegments; i++) {
            let h = (i + 1) * height / vsegments;
            let curve = 0.25 + curveSum(h) - 2*dscale*0.2/(3*width);
            for (let j = 0; j < hsegments; j++) {
                let angle = j * (2 * Math.PI / hsegments);
                if (i % 2 == 0)
                    angle += Math.PI / hsegments;
                let td = h * twist;
                angle += td;
                let dx = curve * width * Math.cos(angle);
                let dy = curve * width * Math.sin(angle);

                let shape = new THREE.TorusGeometry( 0.4, 0.1, 6, 12 );
                shape.rotateX(Math.PI/2);

                shape.rotateY(Math.PI/2);

                let k = width/10+20/30;
                let l = height/10;
                shape.scale(l, l*k, l*k);

                let a = 0.25+curveSum(h);
                let b = 0.25+curveSum(h-0.001);
                k = Math.atan((a-b)/0.001);
                k *= 3*width/10;
                shape.rotateZ(-Math.PI*k + Math.PI/2);

                shape.rotateY(1 - angle - 2.5*Math.PI/8);

                shape.translate(dx, h, dy);
                let indexStart = decorationsGeometry.vertices.length;
                decorationsGeometry.vertices = decorationsGeometry.vertices.concat(shape.vertices);
                let faces = [];
                for(let i = 0; i < shape.faces.length; i++) {
                    if(i % 24 < 12)
                        continue;
                    let face = shape.faces[i];
                    face.a += indexStart;
                    face.b += indexStart;
                    face.c += indexStart;
                    faces.push(face);
                }
                decorationsGeometry.faces = decorationsGeometry.faces.concat(faces);
            }
        }
    }*/

    function tailsDecorationFunction() {
        let vsegments = dparam;
        let hsegments = 2*dparam;
        for (let i = 0; i < vsegments; i++) {
            for (let j = 0; j < hsegments; j++) {
                /*let h = (i + 0.5) * height / vsegments;
                let curve = 0.25 + curveSum(h);
                let r = curve * width;

                let l = height / 10;
                let shape = new THREE.TorusGeometry(r, l * dscale, 12, hsegments);

                shape.rotateX(Math.PI / 2);

                shape.translate(0, h, 0);
                let indexStart = decorationsGeometry.vertices.length;
                decorationsGeometry.vertices = decorationsGeometry.vertices.concat(shape.vertices);
                let faces = [];
                for (let i = 0; i < shape.faces.length; i++) {
                    let face = shape.faces[i];
                    face.a += indexStart;
                    face.b += indexStart;
                    face.c += indexStart;
                    faces.push(face);
                }
                decorationsGeometry.faces = decorationsGeometry.faces.concat(faces);*/
                let h = (i + 0.5) * height / vsegments;
                let curve = 0.25 + curveSum(h);
                let k = width/3;
                curve += dscale*0.125/k;
                let angle = j * (2 * Math.PI / hsegments);
                let td = h * twist + swaving*Math.sin(rwaving*h);
                angle += td;
                let dx = curve * width * Math.cos(angle);
                let dy = curve * width * Math.sin(angle);

                let shape = new THREE.BoxGeometry( dscale, 0.25, 0.25 );

                shape.rotateY(1 - angle - 2.5*Math.PI/8);
                shape.translate(dx, h, dy);

                let indexStart = decorationsGeometry.vertices.length;
                decorationsGeometry.vertices = decorationsGeometry.vertices.concat(shape.vertices);
                let faces = [];
                for (let i = 0; i < shape.faces.length; i++) {
                    let face = shape.faces[i];
                    face.a += indexStart;
                    face.b += indexStart;
                    face.c += indexStart;
                    faces.push(face);
                }
                decorationsGeometry.faces = decorationsGeometry.faces.concat(faces);
            }
        }
    }

    function ttailsDecorationFunction() {
        let vsegments = 12;
        let hsegments = dparam;
        for (let i = 0; i < vsegments; i++) {
            for (let j = 0; j < hsegments; j++) {
                let h = (i + 0.5) * height / vsegments;
                let curve = 0.25 + curveSum(h);
                let k = width/3;
                curve += dscale*0.125/k;
                let angle = j * (2 * Math.PI / hsegments);
                let td = h * twist + swaving*Math.sin(rwaving*h);
                angle += td;
                let dx = curve * width * Math.cos(angle);
                let dy = curve * width * Math.sin(angle);

                let shape = new THREE.BoxGeometry( dscale, 0.25, 0.25 );

                shape.rotateY(1 - angle - 2.5*Math.PI/8);
                shape.translate(dx, h, dy);

                let indexStart = decorationsGeometry.vertices.length;
                decorationsGeometry.vertices = decorationsGeometry.vertices.concat(shape.vertices);
                let faces = [];
                for (let i = 0; i < shape.faces.length; i++) {
                    let face = shape.faces[i];
                    face.a += indexStart;
                    face.b += indexStart;
                    face.c += indexStart;
                    faces.push(face);
                }
                decorationsGeometry.faces = decorationsGeometry.faces.concat(faces);
            }
        }
    }

    function formDecorationFunction() {
        let outerRadius = 4*dscale;
        let innerRadius = 4*dscale - calcThickess(thickness);
        let arcShape = new THREE.Shape();
        arcShape.absarc(outerRadius, outerRadius, outerRadius, 0, Math.PI * 2, false);
        let holePath = new THREE.Path();
        holePath.absarc(outerRadius, outerRadius, innerRadius, 0, Math.PI * 2, true);
        arcShape.holes.push(holePath);

        let geom = new THREE.ExtrudeGeometry(arcShape, {
          depth: height,
          bevelEnabled: false,
          steps: 1,
          curveSegments: hsegments
        });
        geom.center();
        geom.translate(0, 0, height/2);
        geom.rotateX(Math.PI * -.5);

        let box = new THREE.BoxGeometry( 8*dscale, height, calcThickess(thickness));
        box.translate(0, height/2, 0);
        geom.merge(box);

        decorationsGeometry.vertices = decorationsGeometry.vertices.concat(geom.vertices);
        decorationsGeometry.faces = decorationsGeometry.faces.concat(geom.faces);
    }

    function decorate() {
        for(let k = 0; k < decorationFunctions.length; k++) {
            dparam = decorationFunctions[k][1];
            dscale = decorationFunctions[k][2];
            decorationFunctions[k][0]();
        }
    }

    let baseRadialFunction = function (j, i, h, angle, curve, inner) {
        return 1;
    };

    let shrinkRadialFunction = function (j, i, h, angle, curve, inner) {
        let base = 1;
        if (inner)
            base -= thickness*dscale*(Math.cos(dparam*angle)+1)/(2*height/10);
        return base - dscale*(Math.cos(dparam*angle)+1);
    };

    let spikesRadialFunction = function (j, i, h, angle, curve, inner) {
        if (inner)
            return 1;
        if (Math.cos((1/dparam)*hsegments*angle) !== 1)
            return 1;
        return 1 + dscale/(Math.PI*curve);
    };

    let ispikesRadialFunction = function (j, i, h, angle, curve, inner) {
        if (inner)
            return 1;
        if (Math.cos((1/dparam)*hsegments*angle) === 1)
            return 1;
        return 1 + dscale/(Math.PI*curve);
    };

    let wavesRadialFunction = function (j, i, h, angle, curve, inner) {
        let x = j;
        return 1 + dscale * Math.sqrt(1 - Math.pow(Math.acos(Math.cos(Math.PI*x/dparam+Math.PI/2))/Math.PI, 2)) / curve;
    };

    let cshrinkRadialFunction = function (j, i, h, angle, curve, inner) {
        return 1 + dscale*Math.sqrt(1 - Math.pow(Math.acos(Math.cos(dparam*angle))/Math.PI, 2)) / curve;
    };

    let ishrinkRadialFunction = function (j, i, h, angle, curve, inner) {
        let base = 1;
        return base - dscale*Math.sqrt(1 - Math.pow(Math.acos(Math.cos(dparam*angle))/Math.PI, 2)) / curve;
    };

    let tshrinkRadialFunction = function (j, i, h, angle, curve, inner) {
        let meta = (1/Math.PI) * Math.asin(Math.sin(dparam*angle)) + 0.5;
        return 1 + dscale*meta / curve;
    };

    let cornersRadialFunction = function (j, i, h, angle, curve, inner) {
        let meta = 0.1 - Math.pow(Math.acos(Math.cos(dparam*angle))/Math.PI, 2);
        if (meta < 0)
            return 1;
        return 1 + dscale * Math.sqrt(meta);
    };

    let spheresRadialFunction = function (j, i, h, angle, curve, inner) {
        let a = 0, b = 0, d = 0;
        let meta = 0.3 - Math.pow(Math.acos(Math.cos(dparam*angle))/Math.PI, 2);
        if (meta > 0)
            b = Math.sqrt(meta);

        let x = h/height;
        meta = 0.3 - Math.pow(Math.acos(Math.cos(2*dparam*Math.PI*x + Math.PI))/Math.PI, 2);
        if (meta > 0)
            a = Math.sqrt(meta);

        let r = a * b;
        return 1 + dscale * r / curve;
    };

    let gridRadialFunction = function (j, i, h, angle, curve, inner) {
        if (inner)
            return 1;
        if (j % 4 === 0)
            return 1 + dscale;
        if (i % 4 === 0)
            return 1 + dscale;
        return 1;
    };

    let stripsRadialFunction = function (j, i, h, angle, curve, inner) {
        if (Math.floor(i / dparam) % 2 === 0)
            return 1 + dscale;
        return 1;
    };

    /*var voronoiRadialFunction = function (j, i, h, angle, curve, inner) {
        let nearest1 = grid[0];
        let nearest2 = undefined;
        let point = new THREE.Vector2(i, j);
        for (let k = 0; k < grid.length; k++) {
            if (point.distanceTo(grid[k]) < nearest1.distanceTo(point))
                nearest1 = grid[k];
        }
        for (let k = 0; k < grid.length; k++) {
            let dist = 1000;
            if (nearest2 != undefined)
                dist = nearest2.distanceTo(point)
            if (point.distanceTo(grid[k]) < dist && grid[k] != nearest1)
                nearest2 = grid[k];
        }

        if (Math.abs(point.distanceTo(nearest1) - point.distanceTo(nearest2)) < 1.5)
            return 1;
        return 1.2;
    };*/

    let radialFunctions = [];
    let decorationFunctions = [];

    function applyDecoration(decoration) {
        if (decoration[0] != "form") {
            spheres = [];
            if (!patternApplied)
                pattern = undefined;
        }
        switch(decoration[0]) {
            case 'shrink':
                radialFunctions.push([shrinkRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'cshrink':
                radialFunctions.push([cshrinkRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'tshrink':
                radialFunctions.push([tshrinkRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'ishrink':
                radialFunctions.push([ishrinkRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'spikes':
                radialFunctions.push([spikesRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'ispikes':
                radialFunctions.push([ispikesRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'waves':
                radialFunctions.push([wavesRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'corners':
                radialFunctions.push([cornersRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'spheres':
                radialFunctions.push([spheresRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'grid':
                radialFunctions.push([gridRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'strips':
                radialFunctions.push([stripsRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'voronoi':
                voronoi(decoration[1], decoration[2]);
                //radialFunctions.push([voronoiRadialFunction, decoration[1], decoration[2]]);
                break;
            case 'knitting':
                knitting(decoration[1], decoration[2], hsegments, vsegments, height, width);
                break;
            case 'arcs':
                ydparam = decoration[1];
                ydscale = decoration[2];
                break;
            case 'tails':
                decorationFunctions.push([tailsDecorationFunction, decoration[1], decoration[2]]);
                break;
            case 'ttails':
                decorationFunctions.push([ttailsDecorationFunction, decoration[1], decoration[2]]);
                break;
            case 'form':
                decorationFunctions.push([formDecorationFunction, decoration[1], decoration[2]]);
                break;
            case 'swell':
                swell(decoration[1], decoration[2]);
                break;
            case 'ball':
                ball(decoration[1], decoration[2]);
                break;
        }
    }

    function curve(t, amp, tx) {
	    return Math.easeInOutSine(t, amp, tx);
    }

    Math.easeInOutSine = function (t, amp, tx) {
        let amplitude = (1/(3*width))*height*amp/2;
        let tk = (height/10);
        return -amplitude/2 * (Math.cos(Math.PI*(t+tx+height/4+tk*translation)/(delta*height/4)) - 1);
    };

    function curveSum(h) {
        let xs = [0, height/6, height/3, height/2, 2*height/3, 5*height/6, height];
        let ys = [G, F, E, D, C, B, A];

        return spline(h, xs, ys);
    }

    function createFloor(j, h, scale=1, offset=0, closed=false, flip=false, inner=false) {
        let addOffset = 0;
        if(closed)
            geometry.vertices.push(new THREE.Vector3(0, h, 0));
        let curve = 0.25+curveSum(h);
        let yoffset = 0;
        if (ydparam > 0)
            yoffset = ydscale * Math.sin(0.5*ydparam*h);
        for(let i = 0; i < hsegments; i++) {
            let angle = i * (2 * Math.PI / hsegments);
            let td = (h*twist + swaving*Math.sin(rwaving*h))/(height/10);
            let radius = 1;
            for(let k = 0; k < radialFunctions.length; k++) {
                dparam = radialFunctions[k][1];
                dscale = radialFunctions[k][2];
                radius += radialFunctions[k][0](j, i, h, angle, curve, inner) - 1;
            }
            let dx = radius * curve * scale * Math.cos(angle+td) - offset*Math.cos(angle+td) + yoffset;
            let dy = radius * curve * scale * Math.sin(angle+td) - offset*Math.sin(angle+td) + yoffset;
            let vertex = new THREE.Vector3(dx, h, dy);
            swellFunction(vertex, inner, thickness);
            geometry.vertices.push(vertex);
            addOffset++;
        }
        if(closed) {
            for(let i = 0; i < hsegments - 1; i++) {
                addFace3(geometry, 0, i+1, i+2, flip);
            }
            addFace3(geometry, 0, hsegments, 1, flip);
            addOffset++;
        }

        return addOffset;
    }

    function createFingerprint() {
        fingerprint = [];
        for (let i = 0; i <= 100; i++) {
            let h = (i/100)*height;
            let curve = 0.25+curveSum(h);
            let radius = 1;
            for(let k = 0; k < radialFunctions.length; k++) {
                dparam = radialFunctions[k][1];
                dscale = radialFunctions[k][2];
                radius += radialFunctions[k][0](i, 0, h, 0, curve, false) - 1;
            }
            let scale = width;
            let value = radius * curve * scale - calcThickess(thickness)/2;
            fingerprint.push(value);
        }
    }

    function addFace3(geometry, x, y, z, flip=false) {
        if (flip)
            geometry.faces.push(new THREE.Face3(indexOffset+x, indexOffset+y, indexOffset+z));
        else
            geometry.faces.push(new THREE.Face3(indexOffset+z, indexOffset+y, indexOffset+x));
    }

    function addFace4(geometry, x, y, z, w, flip=false) {
        if(flip) {
            geometry.faces.push(new THREE.Face3(indexOffset+z, indexOffset+y, indexOffset+x));
            geometry.faces.push(new THREE.Face3(indexOffset+y, indexOffset+z, indexOffset+w));
        }
        else {
            geometry.faces.push(new THREE.Face3(indexOffset+x, indexOffset+y, indexOffset+z));
            geometry.faces.push(new THREE.Face3(indexOffset+w, indexOffset+z, indexOffset+y));
        }
    }

    function createSide(scale=1, offset=0, lift=0, flip=false, inner=false) {
        let addOffset = 0;
        addOffset += createFloor(0, lift, scale, offset, true, flip, inner);
        indexOffset++;
        for(let i = 0; i < vsegments; i++) {
            let h = (i+1) * (height-lift) / vsegments;
            addOffset += createFloor(i, lift+h, scale, offset, false, false, inner);
            for(let j = 0; j < hsegments-1; j++) {
                addFace4(geometry, i*hsegments+j, i*hsegments+j+1, i*hsegments+j+hsegments, i*hsegments+j+hsegments+1, flip);
            }
            addFace4(geometry, i*hsegments+hsegments-1, i*hsegments, i*hsegments+2*hsegments-1, i*hsegments+hsegments, flip);
        }
        return addOffset;
    }

    function calcThickess(t)
    {
        let u = (Math.PI/2)*(1-2/hsegments);
        let d = t/Math.sin(u);
        return d;
    }

    let clone;
    function bendPattern() {
        let coef = (height - (eheight/100) * height);
        /*if (patternMesh)
            scene.remove(patternMesh);*/
        clone = pattern.clone();
        for(let i = 0; i < clone.vertices.length; i++) {
            /*let vertex = pattern.vertices[i];
            let curve = 0.25+curveSum(2*Math.PI*vertex.y);
            curve *= 0.5;
            curve -= vertex.z;
            let angle = vertex.x/curve;
            vertex.x = curve*Math.cos(angle);
            vertex.z = curve*Math.sin(angle);*/

            /*let vertex = pattern.vertices[i];
            let curve = 0.25+curveSum(vertex.y);
            let angle = vertex.x/curve;
            vertex.x = curve*Math.cos(angle);
            vertex.z = curve*Math.sin(angle);*/

            let vertex = clone.vertices[i];
            vertex.y *= eheight/100;
            vertex.y += (eposition/100) * coef;
            let curve = 0.25+curveSum(vertex.y);
            //let angle = (1/width)*vertex.x/curve;
            let angle = vertex.x/width;
            let td = (vertex.y*twist + swaving*Math.sin(rwaving*vertex.y))/(height/10);
            angle += td;
            curve -= (0.05 * extrusion) / 2;
            curve += vertex.z * extrusion;
            vertex.x = width*curve*Math.cos(angle);
            vertex.z = width*curve*Math.sin(angle);
        }

        //let mesh = new THREE.Mesh(clone, new THREE.MeshPhongMaterial({color: 0xff0000}));
        //mesh.position.y = -height/13;
        //mesh.position.z = 0.5;
        //let multiplier = 1/40*width + 3/4;
        //scene.add(mesh);

        //patternMesh = mesh;
    }

    for (let i = 0; i < decorations.length; i++) {
        applyDecoration(decorations[i]);
    }
    if (form != 0)
        applyDecoration(["form", 0, form]);
    indexOffset += createSide(width);
    indexOffset -= hsegments;
    for(let i = 0; i < hsegments-1; i++) {
        addFace4(geometry, i, i+1, i+hsegments+vsegments*hsegments+1, i+hsegments+vsegments*hsegments+2);
    }
    addFace4(geometry, hsegments-1, 0, 2*hsegments+vsegments*hsegments, hsegments+vsegments*hsegments+1);
    indexOffset += hsegments;
    indexOffset += createSide(width, calcThickess(thickness), bottom, true, true);

    createFingerprint();

    decorate();
    geometry.merge(decorationsGeometry);
    if(pattern) {
        bendPattern();
        //console.log(pattern);
        geometry.merge(clone);
        //let mesh = new THREE.Mesh(pattern, new THREE.MeshPhongMaterial({color: 0xff0000}));
        //scene.add(mesh);
    }

    geometry.computeVertexNormals();
    let baseGeometry = geometry.clone();

    geometry.computeBoundingSphere();
    let multiplier = 1/40*width + 3/4;
    normalizationRatio = multiplier / geometry.boundingSphere.radius;

    if (handle) {
        dragHandle(true);
        baseGeometry.merge(handleGeometry);
    }
    baseGeometry.computeFaceNormals();
    if (normalize) {
        geometry.normalize();
        geometry.computeBoundingSphere();
    }

    let material = new THREE.MeshLambertMaterial( { color: 0x270202, emissive: 0x370202, side: THREE.DoubleSide, flatShading: true } );

    base = new THREE.Mesh(baseGeometry, material);
    return new THREE.Mesh(geometry, material);
}

var vase, base;
var pattern;
var wireframe;

var mesh1 = new THREE.Mesh(new THREE.Geometry());
var mesh2 = new THREE.Mesh(new THREE.Geometry());
var base1 = new THREE.Geometry();
var base2 = new THREE.Geometry();

function updateVase(hsegments, vsegments, width, height, thickness, A=0.5, B=0.5, C=0.5, D=0.5, E=0.5, F=0.5, G=0.5, delta=1, translation=0, twist=0, decorations=[], bottom, extrusion, eheight, eposition, rwaving, swaving, rmodels, double, model) {
    width /= 3;
    /*if (vase) {
        scene.remove(vase);
        vase.geometry.dispose();
        vase.material.dispose();
        geo.dispose();
        mat.dispose();
        base.geometry.dispose();
    }*/
    scene.remove(vase);

    if (double) {
        if (model === 1) {
            mesh1 = createVase(hsegments, vsegments, width, height, thickness, A, B, C, D, E, F, G, delta, translation, twist, decorations, bottom, extrusion, eheight, eposition, rwaving, swaving, false);
            mesh1.geometry.rotateY(2*Math.PI*rmodels);
            vase = mesh1.clone();
            vase.geometry = mesh1.geometry.clone();
            vase.geometry.mergeMesh(mesh2);
            vase.geometry.normalize();
            vase.geometry.computeBoundingSphere();
            base1 = base.geometry.clone();
            base.geometry.merge(base2);
        }
        else {
            mesh2 = createVase(hsegments, vsegments, width, height, thickness, A, B, C, D, E, F, G, delta, translation, twist, decorations, bottom, extrusion, eheight, eposition, rwaving, swaving, false);
            mesh2.geometry.rotateY(2*Math.PI*rmodels);
            vase = mesh2.clone();
            vase.geometry = mesh2.geometry.clone();
            vase.geometry.translate(0, mesh1.geometry.vertices[0].y - mesh2.geometry.vertices[0].y, 0);
            vase.geometry.mergeMesh(mesh1);
            vase.geometry.normalize();
            vase.geometry.computeBoundingSphere();
            base2 = base.geometry.clone();
            base.geometry.merge(base1);
        }
    }
    else {
        vase = createVase(hsegments, vsegments, width, height, thickness, A, B, C, D, E, F, G, delta, translation, twist, decorations, bottom, extrusion, eheight, eposition, rwaving, swaving, true);
    }

    /*if (models == 2) {
        let vase2 = vase.geometry.clone();
        vase2.rotateY(rmodels*2*Math.PI);
        vase.geometry.merge(vase2);
        let base2 = base.geometry.clone();
        base2.rotateY(rmodels*2*Math.PI);
        base.geometry.merge(base2);
    }*/

    //vase.remove( wireframe );
    let geo = new THREE.WireframeGeometry( vase.geometry );
    let mat = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 1 } );
    wireframe = new THREE.LineSegments( geo, mat );
    vase.add( wireframe );

    let multiplier = 1/40*width + 3/4;
    vase.scale.set(multiplier, multiplier, multiplier);

    window.height = height;
    window.width = width;

    scene.add(vase);
}

var height;
var patternApplied = false;

function createPattern(data, width, height, parts) {
    if (!data)
        return;

    patternApplied = true;

    setSliderTo("value1", 80);
    setSliderTo("value2", 60);

    let isolines = MarchingSquaresJS.isoLines(data, 128);

    isolines.shift();

    for(let i = 0; i < isolines.length; i++) {
        isolines[i] = Array.from(new Set(isolines[i].map(JSON.stringify)), JSON.parse);
    }

    let scale = window.height / height;
    let shapes = [];
    for(let j = 0; j < isolines.length; j++) {
        let subshapes = [];
        for (let k = 0; k < parts; k++) {
            let shape = new THREE.Shape();
            let vertex = isolines[j][0];
            shape.currentPoint.x = k*width/(parts/2) + scale*vertex[0];
            shape.currentPoint.y = scale*vertex[1];
            for(let i = 1; i < isolines[j].length; i++) {
                let vertex = isolines[j][i];
                shape.lineTo(k*width/(parts/2) + scale*vertex[0], scale*vertex[1]);
            }
            subshapes.push(shape);
        }
        shapes = shapes.concat(subshapes);
    }

    let extrudeSettings = {
        steps: 1,
        depth: 0.05,
        bevelEnabled: false,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 1
    };

    let geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);

    pattern = geometry;

    /*let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0xff0000}));
    mesh.position.set(0, 0, 0.5);
    scene.add(mesh);*/

    //console.log(isolines);
}

var directionalLight = new THREE.DirectionalLight( 0xFFFFFF, 2);
directionalLight.position.set( 100, 100, 100 );
directionalLight.target.position.set( 0, 50, 0 );
scene.add(directionalLight);

var ambientLight = new THREE.HemisphereLight(0xFFFFFF, 0x000000, 1);
scene.add(ambientLight);

camera.position.y = 4;
camera.position.z = 6;

var light = new THREE.SpotLight(0xFFFFFF, 2, 4, 45);
scene.add(light);

var render = function () {
  requestAnimationFrame(render);

  controls.update();

  renderer.render(scene, camera);
};

render();
