import * as THREE from './three';
import { OrbitControls } from './three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from './three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from './three/addons/postprocessing/GlitchPass.js';
import { OutputPass } from './three/addons/postprocessing/OutputPass.js';
import { DebugEnvironment } from "./three/examples/jsm/environments/DebugEnvironment";
import "./style.css";

let currentModel = null;
let active = {
  light: new THREE.DirectionalLight(0xffffff, 4), // Initial active light (directionalLight)
  type: "directionalLight",
};

let model; // Declare the model variable here

// Create a scene, camera and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Create a WebGLRenderer with anti-aliasing enabled
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  pixelRatio: window.devicePixelRatio 
});

// Set the renderer size and other properties
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor(0xF0F8FF);
renderer.outputColorSpace = THREE.outputColorSpace;
document.body.appendChild( renderer.domElement );

// Create an EffectComposer and add Passes
const composer = new EffectComposer( renderer);
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

const outputPass = new OutputPass();
composer.addPass( outputPass );

// A light that gets emitted in a specific direction.
const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.position.set(0, 2, 100);

// This light gets emitted from a single point in one direction,
const spotLight = new THREE.SpotLight(0xffffff, 15);
spotLight.position.set(0, 10, 10);

// This light globally illuminates all objects in the scene equally.
const ambientLight = new THREE.AmbientLight(0x404040, 3);

const lights = {
  directionalLight,
  spotLight,
  ambientLight
};

let activeLight = directionalLight;

// Create OrbitControls
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableZoom = true;
controls.minDistance = 0.5;
controls.maxDistance = 5;
controls.enablePan = true;

const loader = new GLTFLoader();

// Function to load and display the 3D model
function loadModel(modelPath) {
  const loader = new GLTFLoader();

  // Remove the current model from the scene if it exists
  if (currentModel) {
    scene.remove(currentModel);
  }

  loader.load(modelPath, (gltf) => {
    model = gltf.scene;

    // You can scale, position, and rotate the model as needed
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);

    // Calculate the bounding box of the loaded model
    const boundingBox = new THREE.Box3().setFromObject(model);

    // Calculate the center of the bounding box
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    // Set the camera's position to focus on the center of the model
    camera.position.copy(center);
    camera.lookAt(center);

    // You can iterate through the materials of the model to set anisotropy for each texture
    model.traverse((child) => {
      if (child.isMesh) {
        const material = child.material;

        // Check if the material has a texture map
        if (material.map) {
          material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }

        // Add other textures and set anisotropy for them if needed
        // For example: material.normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    });

    // Store the reference to the current model
    currentModel = model;

    scene.add(model);
    scene.add(active.light);
  });
}

// Handle file input change event
document.getElementById('modelInput').addEventListener('change', (event) => {
  const file = event.target.files[0];

  if (file) {
    const modelURL = URL.createObjectURL(file);
    loadModel(modelURL);
  }
});

// Handle button clicks to control lighting and environment
document.querySelectorAll("button").forEach((elem) => {
  elem.addEventListener("click", function () {
    // Remove the active light from the scene
    scene.remove(activeLight);

    const id = this.id;

    if (id === "hdr") {
      // Handle HDR environment map
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileCubemapShader();

      const envScene = new DebugEnvironment();
      const generatedCubeRenderTarget = pmremGenerator.fromScene(envScene);

      // Set the environment map only if the model is defined
      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            const material = child.material;

            // Check if the material has a texture map
            if (material.map) {
              material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }

            // Set the cube's material to use the environment map
            material.envMap = generatedCubeRenderTarget.texture;

            // Check if the material has a "needsUpdate" property before setting it
            if (material.hasOwnProperty("needsUpdate")) {
              material.needsUpdate = true;
            }
          }
        });
      }

      // Set the scene's background to the environment map
      scene.background = null;
    } else {
      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            const material = child.material;

            // Check if the material has a "needsUpdate" property before setting it
            if (material.hasOwnProperty("needsUpdate")) {
              material.needsUpdate = true;
            }

            // Remove the environment map
            material.envMap = null;
          }
        });
      }

      // Handle different lights
      activeLight = lights[id]; // Set the active light
      active.type = id;
      scene.add(activeLight);

      // Set the background to a solid color (adjust as needed)
      scene.background = new THREE.Color(0xF0F8FF); // Set to the original background color
    
    }

    // Check if the model has a "needsUpdate" property before setting it
    if (model && model.hasOwnProperty('needsUpdate')) {
      model.needsUpdate = true;
    }

    // Update the button styles
    document.querySelector(".selected").classList.remove("selected");
    this.classList.add("selected");
  });
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();
