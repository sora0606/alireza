import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import vertex from "./shader/vertex.glsl"
import fragment from "./shader/fragment.glsl"

import dat from "dat.gui";

import red from "../red.png?url";
import green from "../green.png?url";
import gray from "../gray.png?url";
import bg from "../bg.jpg?url";
import bg1 from "../bg1.jpg?url";
import bg2 from "../bg2.jpg?url";

import { Lethargy } from "lethargy";
import { WheelGesture } from "@use-gesture/vanilla";
import VirtualScroll from 'virtual-scroll';

export default class Sketch {
    constructor(opstions) {
        this.current = 0;
        this.scenes = [
            {
                bg: bg,
                matcap: red,
                geometry: new THREE.BoxGeometry(0.1, 0.1, 0.1)
            },
            {
                bg: bg1,
                matcap: gray,
                geometry: new THREE.TorusGeometry(0.3, 0.05, 50.0, 10.0)
            },
            {
                bg: bg2,
                matcap: green,
                geometry: new THREE.SphereGeometry(0.1, 29.0, 20.0)
            }
        ];

        this.container = opstions.dom;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0xeeeeee, 1);

        this.container.appendChild(this.renderer.domElement);


        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.001,
            1000.0
        );
        this.camera.position.set(0.0, 0.0, 2.0);

        this.scenes.forEach((o, i) => {
            o.scene = this.createScene(o.bg, o.matcap, o.geometry);
            this.renderer.compile(o.scene, this.camera);
            o.target = new THREE.WebGLRenderTarget(this.width, this.height);
        });

        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.time = 0;

        this.isPlaying = true;

        this.currentState = 0;
        this.scroller = new VirtualScroll();
        this.scroller.on(event => {
            // wrapper.style.transform = `translateY(${event.y}px)`
            console.log(this.currentState);
            this.currentState -= event.deltaY / 4000;

            this.currentState = (this.currentState + 3000)%3;
        });

        // this.addObjects();
        this.initPost();
        this.resize();
        this.render();
        this.setupResize();
        this.settings();
    }

    initPost() {
        this.postScene = new THREE.Scene();
        let frustumSize = 1;
        let aspect = 1;
        this.postCamera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, -1000, 1000);

        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: {
                progress: { value: 0 },
                uTexture1: { value: new THREE.TextureLoader().load(bg) },
                uTexture2: { value: new THREE.TextureLoader().load(bg1) },
            },
            // wireframe: true,
            // transparent: true,
            vertexShader: vertex,
            fragmentShader: fragment,
        });

        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 1.0),
            this.material
        );

        this.postScene.add(this.quad);
    }

    settings() {
        let that = this;
        this.settings = {
            progress: 0,
        };

        this.gui = new dat.GUI();
        this.gui.add(this.settings, "progress", 0.0, 1.0, 0.01);
    }

    setupResize() {
        window.addEventListener('resize', this.resize.bind(this));
    }

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;

        this.camera.updateProjectionMatrix();
    }

    createScene(backgound, matcap, geometry) {
        let scene = new THREE.Scene();

        let bgTexture = new THREE.TextureLoader().load(backgound);
        scene.background = bgTexture;
        let material = new THREE.MeshMatcapMaterial({
            matcap: new THREE.TextureLoader().load(matcap)
        });

        // let geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        let mesh = new THREE.Mesh(geometry, material);

        for (let index = 0; index < 300; index++) {
            let random = new THREE.Vector3().randomDirection();
            let clone = mesh.clone();
            clone.position.copy(random);
            clone.rotation.x = Math.random();
            clone.rotation.y = Math.random();
            scene.add(clone);
        }

        return scene;
    }

    addLight() {
        const light1 = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
        light2.position.set(0.5, 0.0, 0.866)
        this.scene.add(light2);
    }

    stop() {
        this.isPlaying = false;
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.render();
        }
    }

    render() {
        if (!this.isPlaying) return;
        this.time += 0.05;

        this.current = Math.floor(this.currentState);
        this.next = Math.floor((this.currentState + 1) % this.scenes.length);
        this.progress = this.currentState % 1;

        console.log(this.current, this.next ,this.progress);

        this.renderer.setRenderTarget(this.scenes[this.current].target);
        this.renderer.render(this.scenes[this.current].scene, this.camera);

        this.renderer.setRenderTarget(this.scenes[this.next].target);
        this.renderer.render(this.scenes[this.next].scene, this.camera);

        this.renderer.setRenderTarget(null);

        this.material.uniforms.uTexture1.value = this.scenes[this.current].target.texture;
        this.material.uniforms.uTexture2.value = this.scenes[this.next].target.texture;

        this.material.uniforms.progress.value = this.progress;

        // update scenes
        this.scenes.forEach((o) => {
            o.scene.rotation.y = this.time * 0.1;
        });

        requestAnimationFrame(this.render.bind(this));
        // this.renderer.render(this.scenes[0].scene, this.camera);
        this.renderer.render(this.postScene, this.postCamera);
    }
}

new Sketch({
    dom: document.getElementById("container")
});