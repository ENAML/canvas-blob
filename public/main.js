
/**
 * Testing drawing blobs with cubic bezier curves:
 * - A circle can be modelled by 4 (maybe 8?) bezier curves:
 * one for each quadrant
 * - The midpoints of the bezier curves, should only be movable on 1 axis,
 * which should be the tangent of its 'parent' point (nearest main point)
 * (example: if we're in the top-right quadrant bezier curve, and it's the
 * first midpoint, it's 'parent' is at (x:0, y:1) and it should only be movable
 * on the x-axis. if it's the second midpoint, it's parent is at (x:1, y:0)
 * and it should only be movable on the y-axis)
 * - If the point was movable on both axes, it would mess up how the bezier
 * curves connect to one another
 * - The value 'k' (kappa) should be the distance of the midpoint from it's parent
 * on the curve, and is a percentage of the radius of the circle (it's ~0.552)
 *
 * Resources:
 * - Most relevant question I could find: http://stackoverflow.com/questions/13329966/javascript-canvas-endless-random-animation-of-slightly-morphing-circle
 * - Explanation (how it works): http://www.whizkidtech.redprince.net/bezier/circle/
 * - The math behind it: http://www.whizkidtech.redprince.net/bezier/circle/kappa/
 */

window.onload = function() {
  var canvas = document.getElementById("canvas"),
    context = canvas.getContext("2d"),
    width = canvas.width = window.innerWidth,
    height = canvas.height = window.innerHeight;

  var TOTAL_POINTS = 5; // the total number of main points

  var MAX_MIDPOINT_ROTATION = Math.PI / 6; // 30 degrees

  var isAnimating = false;
  var canRotate = false;

  var baseRadius = 250;

  var drawCircles = true;
  var fillCircle = false;
  var drawMidPointConnections = true;

  var rotation = 0;
  var rotationDirection = 1;


  /**
   * k (kappa) is the length of bezier curve modifier points (mid points)
   * if the radius of a circle is 1 and if there are 4 main points forming the circle
   * 
   * SOURCE: http://www.whizkidtech.redprince.net/bezier/circle/
   */
  var k = 4 * ((Math.sqrt(2) - 1) / 3);
  k /= (TOTAL_POINTS / 4); // double the points, half the K ?

  // for mouse move events
  var draggingPoint = null;


  // when populating, start at top, populate in clockwise fashion
  var curveStartAngle = -Math.PI / 2; 
  var curveIncrement = Math.PI * 2 / TOTAL_POINTS;

  // create the main points
  var points = [];

  for (var i = 0; i < TOTAL_POINTS; i++) {
    var currentAngle = curveStartAngle + (curveIncrement * i);

    points.push({
      x: Math.cos(currentAngle) * baseRadius,
      y: Math.sin(currentAngle) * baseRadius
    })
  }



  // create the curves between the main lines
  var curves = [];

  for (var i = 0; i < points.length; i++) {
    var nextI = (i + 1) < points.length ? (i + 1) : 0; 

    var currentAngle = curveStartAngle + (i * curveIncrement);

    var currentIncrement = (i * curveIncrement);
    var nextIncrement = (nextI * curveIncrement);

    // console.log('angle (after shift): ',utils.radsToDegrees(currentAngle))
    // console.log('increment: ', utils.radsToDegrees(currentIncrement))
    // console.log('base curve increment: ', utils.radsToDegrees(curveIncrement))

    // the first angle is always the same as the currentIncrement
    var firstMidPointAngle = currentIncrement;

    // the second increment is always the next Increment minus the
    // 180 degrees. there might be some math for it but you can see visually
    var secondMidPointAngle = nextIncrement - (Math.PI);

    curves.push([
      points[i],
      {
        x: getMidPointComponent(points[i].x, Math.cos, firstMidPointAngle, baseRadius * k),
        y: getMidPointComponent(points[i].y, Math.sin, firstMidPointAngle, baseRadius * k),
        baseAngle: firstMidPointAngle,
        currentAngle: firstMidPointAngle,
        // movementAxis: 0 // x-axis
      },
      {
        x: getMidPointComponent(points[nextI].x, Math.cos, secondMidPointAngle, baseRadius * k),
        y: getMidPointComponent(points[nextI].y, Math.sin, secondMidPointAngle, baseRadius * k),
        baseAngle: secondMidPointAngle,
        currentAngle: secondMidPointAngle
        // movementAxis: 1 // y-axis
      },
      points[nextI]
    ]); 
  }


  // midpoint 'couples' cached on main points - each main 'point' has two
  // midpoints associated with it. if we keep them connected,
  // it's easy to modify both of their angles at the same rate, 
  // which means the curve joins won't look awkward
  for (var i = 0; i < points.length; i++) {
    var point = points[i];

    // get the indicies of the curves that this main point is
    // connected to so we can access their midPoints and store them
    var prevCurveIndex = i === 0 ? points.length - 1 : i - 1;
    var nextCurveIndex = i;

    point.midPointConnections = [];
    point.midPointConnections.push(curves[prevCurveIndex][2]);
    point.midPointConnections.push(curves[nextCurveIndex][1]);
    point.midPointMovementDirection = 1; // clockwise
    point.midPointMovementSpeed = Math.random();
  }


  context.translate(width/2, height/2);

  document.addEventListener('mousedown', mousedown);
  document.addEventListener('keydown', keydown);
  // document.addEventListener('keyup', keyup);

  render();
  function render() {
    context.clearRect(-width/2,-height/2,width,height);

    context.save();

    context.rotate(rotation);

    // rotate context
    if (canRotate) {
      rotation += 0.0025 * rotationDirection;

      // randomly reverse rotation direction sometimes
      if (Math.random() > 0.999) {
        console.log('reversing rotation');
        rotationDirection *= -1;
      }
    }

    if (isAnimating) updateMidPoints();

    // draw curves
    context.lineWidth = 2;
    context.strokeStyle = '#000';
    context.lineJoin = "round";
    context.beginPath();
    var curve = curves[0];
    context.moveTo(curve[0].x, curve[0].y);

    for (var i = 0; i < curves.length; i++) {
      curve = curves[i];

      context.bezierCurveTo(curve[1].x, curve[1].y,
        curve[2].x, curve[2].y, curve[3].x, curve[3].y);
    }
    context.closePath();

    if (fillCircle) {
      var gradient = context.createLinearGradient(400,400,-400,-400);
      gradient.addColorStop(0,"#0000ff");
      gradient.addColorStop(1,"pink");
      context.fillStyle = gradient;
      context.fill();
    } else {
      context.stroke();
    }

    if (drawMidPointConnections) {

      // draw lines from curve endpoints to curve midpoints
      context.lineWidth = 5;
      context.strokeStyle = '#0000ff';
      for (var i = 0; i < curves.length; i++) {
        var curve = curves[i];

        context.beginPath();
        context.moveTo(curve[0].x, curve[0].y);
        context.lineTo(curve[1].x, curve[1].y);
        context.moveTo(curve[3].x, curve[3].y);
        context.lineTo(curve[2].x, curve[2].y);
        context.stroke();
      }
    }

    if (drawCircles) {

      // draw bezier mid point circles
      for (var i = 0; i < curves.length; i++) {
        context.fillStyle = '#0000ff';
        for (var j = 1; j <= 2; j++) {
          var midPoint = curves[i][j];
          context.beginPath();
          context.arc(midPoint.x, midPoint.y, 10, 0, Math.PI * 2);
          context.fill();
        }
      }

      // draw main circles
      for (var i = 0; i < points.length; i++) {
        context.fillStyle = '#000';
        context.beginPath();
        context.arc(points[i].x,points[i].y, 10,0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();

    requestAnimationFrame(render);
  }

  function updateMidPoints() {
    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      var midPoints = point.midPointConnections;
      if (!midPoints) continue;

      // update angle
      midPoints[0].currentAngle += point.midPointMovementSpeed *
        0.02 * point.midPointMovementDirection;
      midPoints[1].currentAngle += point.midPointMovementSpeed *
        0.02 * point.midPointMovementDirection;

      // reverse midPoint movement direction if it's gone past maximum
      if (midPoints[0].currentAngle >= midPoints[0].baseAngle + MAX_MIDPOINT_ROTATION ||
        midPoints[1].currentAngle >= midPoints[1].baseAngle + MAX_MIDPOINT_ROTATION)
      {
        point.midPointMovementDirection = -1;
        point.midPointMovementSpeed = Math.random();
      } else if (midPoints[0].currentAngle <= midPoints[0].baseAngle - MAX_MIDPOINT_ROTATION ||
        midPoints[1].currentAngle <= midPoints[1].baseAngle - MAX_MIDPOINT_ROTATION)
      {
        point.midPointMovementDirection = 1;
        point.midPointMovementSpeed = Math.random();
      }

      // update coordinates
      midPoints[0].x = getMidPointComponent(point.x, Math.cos, midPoints[0].currentAngle, baseRadius * k);
      midPoints[0].y = getMidPointComponent(point.y, Math.sin, midPoints[0].currentAngle, baseRadius * k);
      midPoints[1].x = getMidPointComponent(point.x, Math.cos, midPoints[1].currentAngle, baseRadius * k);
      midPoints[1].y = getMidPointComponent(point.y, Math.sin, midPoints[1].currentAngle, baseRadius * k);
    }
  }

  /**
   * [getMidPointComponent description]
   * @param  {[type]} component Either X or Y of midpoint's parent
   * @param  {[type]} trigFn    Either Math.cos or Math.sin
   * @param  {[type]} angle     Angle from parent (main point)
   * @param  {[type]} distance  Distance from main point
   * @return {[type]}           Returns either x or y value of midpoint
   */
  function getMidPointComponent(parentComponent, trigFn, angle, distance) {
    return parentComponent + trigFn(angle) * distance;
  }



  function mousedown(e) {
    var x = e.clientX;
    var y = e.clientY;
    x = x - width / 2;
    y = y - height / 2;

    for (var i = 0; i < curves.length; i++) {
      for (var j = 1; j <= 2; j++) {
        var midPoint = curves[i][j];

        if (utils.circlePointCollision(x, y, {
          x: midPoint.x,
          y: midPoint.y,
          radius: 10
        })) {
          draggingPoint = midPoint;
          document.addEventListener('mousemove', mousemove);
          document.addEventListener('mouseup', mouseup);
          return;
        }
      }
    }
  }

  function mousemove(e) {
    // if (draggingPoint.movementAxis === 0) // can move on x-axis
    // {
      var x = e.clientX;
      x = x - width / 2;
      draggingPoint.x = x;
    // } 
    // else if (draggingPoint.movementAxis === 1) // can move on y-axis
    // {
      var y = e.clientY;
      y = y - height / 2;
      draggingPoint.y = y;
    // }
  }

  function mouseup() {
    draggingPoint = null;
    document.removeEventListener('mousemove', mousemove);
    document.removeEventListener('mouseup', mouseup);
  }



  function keydown(e) {
    console.log(e.keyCode)
    if (e.keyCode === 32) // space bar pressed
    {
      drawCircles = !drawCircles;
      drawMidPointConnections = !drawMidPointConnections;
    }
    else if (e.keyCode === 65) // 'a' was pressed
    {
      isAnimating = !isAnimating;
    } else if (e.keyCode === 70) // 'f' was pressed
    {
      fillCircle = !fillCircle;
    }
    else if (e.keyCode === 82) // 'r was pressed'
    {
      canRotate = !canRotate;
    }
  }

  function keyup(e) {
    if (e.keyCode === 32) // space bar released
    {
      drawCircles = true;
    }
  }

};