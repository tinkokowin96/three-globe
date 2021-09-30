import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  WebGLRenderer,
} from "three";
import vertexShader from "../shaders/vertex.glsl";
import fragmentShader from "../shaders/fragment.glsl";
import atmoshpereVertex from "../shaders/atmosphereVertex.glsl";
import atmoshpereFragment from "../shaders/atmosphereFragment.glsl";
import countries from "../countries.json";
import { random, floor } from "lodash";
import gsap from "gsap";

const canvas = document.getElementById("canvas");
const container = document.getElementById("container");
const country = document.getElementById("country");
const countryName = document.getElementById("countryName");
const populationAmount = document.getElementById("populationAmount");

const camera: PerspectiveCamera = new PerspectiveCamera(
  75,
  //@ts-ignore
  container?.offsetWidth / container?.offsetHeight,
  0.1,
  1000
);
const scene: Scene = new Scene();

const raycaster: Raycaster = new Raycaster();

const renderer: WebGLRenderer = new WebGLRenderer({
  antialias: true,
  //@ts-ignore
  canvas,
});
// @ts-ignore
renderer.setSize(container?.offsetWidth, container?.offsetHeight);
renderer.setPixelRatio(devicePixelRatio);

const globeMesh: Mesh = new Mesh(
  new SphereGeometry(5, 50, 50),
  new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      globeTexture: {
        value: new TextureLoader().load("./img/globe.jpeg"),
      },
    },
  })
);

const atmosphere: Mesh = new Mesh(
  new SphereGeometry(5, 50, 50),
  new ShaderMaterial({
    vertexShader: atmoshpereVertex,
    fragmentShader: atmoshpereFragment,
    side: BackSide,
    blending: AdditiveBlending,
  })
);
atmosphere.scale.set(1.1, 1.1, 1.1);

const starGeometry = new BufferGeometry();
const starPosition = [];
for (let i = 0; i < 10000; i++) {
  const x = random(-1, 1, true) * 2000;
  const y = random(-1, 1, true) * 2000;
  const z = random(-1, 1, true) * 2000;

  starPosition.push(x, y, z);
}
starGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(starPosition, 3)
);

const stars: Points = new Points(
  starGeometry,
  new PointsMaterial({
    color: 0xffffff,
  })
);

const group: Group = new Group();

camera.position.z = 15;

// to map the material the correct position to the sphere
globeMesh.rotation.y = -Math.PI / 2;

group.add(globeMesh);
scene.add(group);
scene.add(atmosphere);
scene.add(stars);

let isPrinted = false;
function createCountryBoxes(countries: any) {
  //@ts-ignore
  countries.forEach((country) => {
    const latDegree = country.latlng[0];
    const lngDegree = country.latlng[1];
    const oriScale = country.population / 100000000;
    const zOriScale = 0.8 * oriScale;
    const name = country.name;

    const xScale = Math.min(Math.max(0.1, oriScale), 0.2);
    const yScale = Math.min(Math.max(0.1, oriScale), 0.2);
    const zScale = Math.min(Math.max(0.2, zOriScale), 0.7);
    const box: Mesh = new Mesh(
      new BoxGeometry(xScale, yScale, zScale),
      new MeshBasicMaterial({
        color: "#3BF7FF",
        opacity: 0.4,
        transparent: true,
      })
    );

    const latRad = (latDegree / 180) * Math.PI;
    const lngRad = (lngDegree / 180) * Math.PI;
    const radius = 5; //we specified in sphere geometry

    const x = radius * Math.cos(latRad) * Math.sin(lngRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lngRad);

    box.position.x = x;
    box.position.y = y;
    box.position.z = z;

    box.lookAt(0, 0, 0);

    //@ts-ignore
    box.country = name;
    // @ts-ignore
    box.population = floor(country.population / 1000000, 3);

    //transform box to be top of globe
    box.geometry.applyMatrix4(new Matrix4().makeTranslation(0, 0, -zScale / 2));

    gsap.to(box.scale, {
      z: 1.4,
      yoyo: true,
      duration: 1,
      repeat: -1,
      ease: "power2",
      delay: Math.random() * 2,
    });

    group.add(box);
  });
}

createCountryBoxes(countries);

const mouse = {
  x: 0,
  y: 0,
  down: false,
  xPrev: 0,
  yPrev: 0,
};

// @ts-ignore
group.rotation.offset = {
  x: 0,
  y: 0,
};

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stars.rotation.x += 0.0005;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(
    //@ts-ignore
    group.children.filter((object) => object.geometry.type === "BoxGeometry")
  );

  group.children.forEach((object) => {
    //@ts-ignore
    object.material.opacity = 0.4;
  });

  gsap.set(country, {
    display: "none",
  });

  if (intersects.length > 0) {
    intersects.forEach(({ object }) => {
      //@ts-ignore
      object.material.opacity = 1;

      gsap.set(country, {
        display: "block",
      });
      // console.log(object);

      //@ts-ignore
      countryName.innerHTML = object.country;
      //@ts-ignore
      populationAmount.innerHTML = object.population;
    });
  }
}

addEventListener("mousedown", (event) => {
  event.preventDefault;
  mouse.down = true;
  mouse.xPrev = event.clientX;
  mouse.yPrev = event.clientY;
});

addEventListener("mouseup", () => (mouse.down = false));

addEventListener("mousemove", ({ clientX, clientY }) => {
  mouse.x = (clientX / innerWidth) * 2 - 1;
  mouse.y = -(clientY / innerHeight) * 2 + 1;

  gsap.set(country, {
    x: clientX,
    y: clientY,
  });

  if (mouse.down) {
    const deltaX = (clientX - mouse.xPrev) * 0.005;
    const deltaY = (clientY - mouse.yPrev) * 0.005;

    // @ts-ignore
    group.rotation.offset.x += deltaX;
    // @ts-ignore
    group.rotation.offset.y += deltaY;

    gsap.to(group.rotation, {
      // @ts-ignore
      y: group.rotation.offset.x,
      // @ts-ignore
      x: group.rotation.offset.y,
      duration: 1,
    });
    mouse.xPrev = clientX;
    mouse.yPrev = clientY;
  }
});
animate();
