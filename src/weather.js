import * as THREE from 'three';
import {createEaveRain} from './eave-rain.js';
import {createSnowCover} from './snow-cover.js';

export function createWeather(scene, texture) {
  const eaves=createEaveRain(scene);
  const snowCover=createSnowCover(scene);
  let weather = 'clear', seed = 127;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const timeUniform = {value: 0};
  const count = 3200, lightRainCount = 1100;
  const origins = [], motion = [], style = [];
  for (let n = 0; n < count; n++) {
    origins.push(random() * 29 - 14.9, random() * 19, random() * 24 - 11.4);
    // Fall speed, trail length, thickness and gust phase are independent per drop.
    motion.push(.66 + random() * .7, .48 + random() * 1.12, .6 + random() * .85, random() * Math.PI * 2);
    style.push(random() * 2 - 1, random() * 2 - 1, .42 + random() * .58);
  }
  const uniforms = {
    uTime: timeUniform,
    uSpeed: {value: 8},
    uLength: {value: .27},
    uWidth: {value: .009},
    uWind: {value: new THREE.Vector2(1.15, -.35)},
    uGust: {value: .38},
    uAlpha: {value: .30},
    uViewportHeight: {value: 1080},
    uPixelWidth: {value: .9},
    uSplashSize: {value: .8}
  };
  const originAttribute = new THREE.InstancedBufferAttribute(new Float32Array(origins), 3);
  const motionAttribute = new THREE.InstancedBufferAttribute(new Float32Array(motion), 4);
  const styleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(style), 3);
  function particleGeometry() {
    const quad = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(quad.index);
    geometry.setAttribute('position', quad.getAttribute('position'));
    geometry.setAttribute('uv', quad.getAttribute('uv'));
    geometry.setAttribute('aOrigin', originAttribute);
    geometry.setAttribute('aMotion', motionAttribute);
    geometry.setAttribute('aStyle', styleAttribute);
    geometry.instanceCount = lightRainCount;
    return geometry;
  }
  const environmentGLSL = `
    float groundHeight(vec2 p) {
      return p.x < 5.78 && p.y < 4.78 ? .14 : -.01;
    }
    bool covered(vec3 p) {
      bool shop = p.x > -6.85 && p.x < 6.18 && p.z > -4.68 && p.z < 4.48;
      bool awning = p.x > -6.85 && p.x < 6.5 && p.z > -4.45 && p.z < 4.64;
      bool cafe = p.x > -13.73 && p.x < -9.07 && p.z > -5.68 && p.z < .58;
      return (shop && p.y < 7.96) || (awning && p.y < 3.97) || (cafe && p.y < 11.03);
    }
  `;
  // Position integrates the wind. The trail follows its instantaneous velocity,
  // so tilting a streak also changes where the drop actually travels and lands.
  const motionGLSL = `
    attribute vec3 aOrigin;
    attribute vec4 aMotion;
    attribute vec3 aStyle;
    uniform float uTime;
    uniform float uSpeed;
    uniform vec2 uWind;
    uniform float uGust;
    ${environmentGLSL}
    vec2 windVelocity() {
      return uWind * (.88 + .22 * aMotion.x) + aStyle.xy * uGust * .45;
    }
    vec2 rainXZ(float time) {
      vec2 sway = vec2(
        sin(time * .57 + aOrigin.z * .045) * 1.25 + sin(time * 1.31 + aMotion.w) * .11,
        sin(time * .43 + aOrigin.x * .04) * .70 + sin(time * .91 + aMotion.w) * .09
      ) * uGust;
      vec2 p = aOrigin.xz + windVelocity() * time + sway;
      return mod(p - vec2(-14.9, -11.4), vec2(29., 24.)) + vec2(-14.9, -11.4);
    }
    vec3 rainVelocity(float time) {
      vec2 gust = vec2(
        cos(time * .57 + aOrigin.z * .045) * .7125 + cos(time * 1.31 + aMotion.w) * .1441,
        cos(time * .43 + aOrigin.x * .04) * .301 + cos(time * .91 + aMotion.w) * .0819
      ) * uGust;
      vec2 wind = windVelocity() + gust;
      return vec3(wind.x, -uSpeed * aMotion.x, wind.y);
    }
  `;
  const rainGeometry = particleGeometry();
  const rain = new THREE.Mesh(rainGeometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    vertexShader: `
      ${motionGLSL}
      uniform float uLength;
      uniform float uWidth;
      uniform float uViewportHeight;
      uniform float uPixelWidth;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vOpacity;
      void main() {
        vec2 xz = rainXZ(uTime);
        float height = mod(aOrigin.y - uTime * uSpeed * aMotion.x, 19.);
        vec3 head = vec3(xz.x, height + groundHeight(xz), xz.y);
        vec3 tail = head - normalize(rainVelocity(uTime)) * uLength * aMotion.y;
        vec4 headView = modelViewMatrix * vec4(head, 1.);
        vec4 tailView = modelViewMatrix * vec4(tail, 1.);
        vec4 view = mix(headView, tailView, uv.y);
        vec2 axis = tailView.xy - headView.xy;
        vec2 across = vec2(-axis.y, axis.x) / max(length(axis), .0001);
        // Maintain a thin screen-space stroke when viewing the whole street.
        // A world-space width cap made far drops subpixel and effectively invisible.
        float pixelSize = 2. * max(.1, -view.z) / (projectionMatrix[1][1] * max(1., uViewportHeight));
        float width = max(uWidth * aMotion.z, pixelSize * uPixelWidth * (.82 + .30 * aStyle.z));
        width *= mix(1., .45, uv.y);
        view.xy += across * position.x * width;
        gl_Position = projectionMatrix * view;
        vUv = uv;
        vWorld = (modelMatrix * vec4(mix(head, tail, uv.y), 1.)).xyz;
        float distanceFade = 1. - smoothstep(120., 180., -view.z);
        float nearFade = smoothstep(.15, .8, -view.z);
        float farContrast = mix(1., 1.3, smoothstep(18., 55., -view.z));
        vOpacity = aStyle.z * (1. - smoothstep(16.5, 19., height)) * distanceFade * nearFade * farContrast;
      }
    `,
    fragmentShader: `
      uniform float uAlpha;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vOpacity;
      ${environmentGLSL}
      void main() {
        if (covered(vWorld) || vWorld.y < groundHeight(vWorld.xz)) discard;
        float edge = 1. - smoothstep(.18, 1., abs(vUv.x * 2. - 1.));
        float trail = smoothstep(0., .07, vUv.y) * (1. - smoothstep(.38, 1., vUv.y));
        float alpha = edge * trail * vOpacity * uAlpha;
        if (alpha < .003) discard;
        vec3 color = mix(vec3(.73, .83, .91), vec3(.54, .68, .79), vUv.y);
        gl_FragColor = vec4(color, alpha);
      }
    `
  }));
  rain.frustumCulled = false;
  rain.visible = false;
  const viewportSize = new THREE.Vector2();
  rain.onBeforeRender = renderer => { uniforms.uViewportHeight.value = renderer.getSize(viewportSize).y; };
  scene.add(rain);

  // Each ring appears at a drop's actual impact point. Its size and lifetime
  // vary, and its position remains still while the water expands.
  const rippleGeometry = particleGeometry();
  const ripple = new THREE.Mesh(rippleGeometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    vertexShader: `
      ${motionGLSL}
      uniform float uSplashSize;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vProgress;
      varying float vOpacity;
      void main() {
        float speed = uSpeed * aMotion.x;
        float age = mod(uTime - aOrigin.y / speed, 19. / speed);
        float lifetime = .19 + aMotion.z * .13;
        float t = clamp(age / lifetime, 0., 1.);
        vec2 impact = rainXZ(uTime - age);
        float size = (.055 + t * .38) * sqrt(aMotion.y) * uSplashSize;
        vec2 offset = position.xy * size;
        offset.y *= .8 + aStyle.z * .2;
        vec3 p = vec3(impact.x + offset.x, groundHeight(impact) + .006, impact.y + offset.y);
        vec4 view = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * view;
        vUv = uv;
        vWorld = (modelMatrix * vec4(p, 1.)).xyz;
        vProgress = t;
        vOpacity = (1. - t) * (1. - t) * aStyle.z * (1. - smoothstep(120., 180., -view.z));
      }
    `,
    fragmentShader: `
      uniform float uAlpha;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vProgress;
      varying float vOpacity;
      ${environmentGLSL}
      void main() {
        if (vOpacity < .002 || covered(vWorld)) discard;
        float r = length(vUv * 2. - 1.);
        float width = max(.035, fwidth(r) * 1.1);
        float outer = 1. - smoothstep(width, width * 2., abs(r - .74));
        float inner = (1. - smoothstep(width, width * 2., abs(r - .42))) * .3 * smoothstep(.08, .45, vProgress);
        float impact = exp(-r * 12.) * max(0., 1. - vProgress * 5.);
        float alpha = (outer + inner + impact) * vOpacity * uAlpha * .6;
        if (alpha < .003) discard;
        gl_FragColor = vec4(.6, .76, .85, alpha);
      }
    `
  }));
  ripple.frustumCulled = false;
  ripple.visible = false;
  scene.add(ripple);

  // Snow keeps its slow drifting point particles, separate from the rain trails.
  const snowOrigins = [];
  for (let n = 0; n < 2400; n++) snowOrigins.push(random() * 29 - 14.5, random() * 19, random() * 24 - 11.5);
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowOrigins, 3));
  const snow = new THREE.Points(snowGeometry, new THREE.ShaderMaterial({
    uniforms: {uTime: timeUniform}, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float uTime;
      varying float fade;
      void main() {
        vec3 p = position;
        float y = mod(p.y - uTime * 1.05, 19.);
        p.x += sin(p.z + uTime * .7) * .65;
        if (p.x > -6.85 && p.x < 6.3 && p.z > -4.65 && p.z < 4.9 && y < 7.96) y += 7.96;
        p.y = y;
        vec4 view = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(90. / max(8., -view.z), 1.5, 5.);
        fade = smoothstep(0., 1., y) * (1. - smoothstep(17., 19., y));
      }
    `,
    fragmentShader: 'varying float fade;void main(){float a=1.-smoothstep(.15,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.92,.97,1.,a*fade*.78);}'
  }));
  snow.frustumCulled = false;
  snow.visible = false;
  scene.add(snow);
  function set(value,quality=true) {
    weather = value;
    eaves.set(value,quality);
    const storm = value === 'storm';
    rain.visible = value === 'rain' || storm;
    snow.visible = value === 'snow';
    snowCover.set(value);
    ripple.visible = rain.visible;
    rainGeometry.instanceCount = rippleGeometry.instanceCount = storm ? count : lightRainCount;
    uniforms.uSpeed.value = storm ? 14 : 8;
    uniforms.uLength.value = storm ? .39 : .27;
    uniforms.uWidth.value = storm ? .014 : .009;
    uniforms.uWind.value.set(storm ? 5.2 : 1.15, storm ? -1.8 : -.35);
    uniforms.uGust.value = storm ? 1.5 : .38;
    uniforms.uAlpha.value = storm ? .34 : .30;
    uniforms.uPixelWidth.value = storm ? 1.05 : .9;
    uniforms.uSplashSize.value = storm ? 1 : .8;
  }
  function animate(time) {
    timeUniform.value = time;
    eaves.animate(time);
    snowCover.animate(time);
    const phase = time % 17;
    return weather === 'storm' ? Math.max(0, 1 - Math.abs(phase - 11.2) * 16) * .8 + Math.max(0, 1 - Math.abs(phase - 11.45) * 20) * .55 : 0;
  }
  return {set, animate, setLighting:eaves.setLighting, rain, snow, ripple, eaves, snowCover};
}
