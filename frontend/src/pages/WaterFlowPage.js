import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as THREE from "three";
import "./WaterFlowPage.css";

const WaterFlowPage = () => {
  const [data, setData] = useState({
    flow1: 0,
    flow2: 0,
    leak1: 0,
    leak2: 0,
  });

  const rendererRef = useRef(null);

  // Fetch Data from Backend
  const fetchData = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/sensor-readings");
      const { flow_rate_1, flow_rate_2, leakage_1, leakage_2 } = res.data;
      setData({ flow1: flow_rate_1, flow2: flow_rate_2, leak1: leakage_1, leak2: leakage_2 });
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Setup Three.js Scene
  useEffect(() => {
    if (rendererRef.current) return;

    const threeContainer = document.getElementById("three-container");
    const labelsContainer = document.getElementById("labels-container");
    if (!threeContainer || !labelsContainer) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    threeContainer.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Pipe setup
    const pipeGeometry = new THREE.CylinderGeometry(0.2, 0.2, 16, 32);
    const pipeMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    pipe.rotation.z = Math.PI / 2;
    scene.add(pipe);

    const createCheckpoint = (x, label, flow, pressure, leak) => {
      const checkpointMaterial = new THREE.MeshBasicMaterial({
        color: leak ? 0xff0000 : 0x00ff00, // Red for leak, green otherwise
      });
      const checkpoint = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), checkpointMaterial);
      checkpoint.position.set(x, 0, 0);
      scene.add(checkpoint);

      if (leak) {
        const dropletMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), dropletMaterial);
        droplet.position.set(x, -0.5, 0);
        scene.add(droplet);

        const dripAnimation = () => {
          droplet.position.y -= 0.05;
          if (droplet.position.y < -2) droplet.position.y = -0.5;
          renderer.render(scene, camera);
          requestAnimationFrame(dripAnimation);
        };
        dripAnimation();
      }

      // Add label dynamically
      const div = document.createElement("div");
      div.className = "label";
      div.style.left = `${50 + (x + 8) * (window.innerWidth / 16)}px`;
      div.style.top = `140px`;
      div.innerHTML = `
        <strong>${label}</strong><br>
        Flow Rate: ${flow} L/s<br>
        Pressure: ${pressure} bar<br>
        ${leak ? "<span class='leak'>Leak Detected!</span>" : ""}
      `;
      labelsContainer.appendChild(div);
    };

    const createTank = (x, label) => {
      const tankMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff });
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 32), tankMaterial);
      tank.position.set(x, 0.5, 0);
      scene.add(tank);

      const div = document.createElement("div");
      div.className = "label";
      div.style.left = `${50 + (x + 8) * (window.innerWidth / 16)}px`;
      div.style.top = `50px`;
      div.innerHTML = `<strong>${label}</strong><br>(Water Tank)`;
      labelsContainer.appendChild(div);
    };

    // Adding tanks and checkpoints
    createTank(-7.25, "Thika Tank");
    createCheckpoint(-2.5, "Ruiru Checkpoint", data.flow1, 4.8, data.leak1);
    createCheckpoint(1.5, "Juja Checkpoint", data.flow2, 4.5, data.leak2);
    createTank(7.25, "Nairobi Apartment");

    // Water flow animation
    const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const water = new THREE.Mesh(new THREE.SphereGeometry(0.1), waterMaterial);
    scene.add(water);

    let waterPosition = -8;
    const animate = () => {
      waterPosition += 0.05;
      if (waterPosition > 8) waterPosition = -8;
      water.position.x = waterPosition;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    camera.position.z = 5;
    animate();

    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        renderer.dispose();
        threeContainer.removeChild(renderer.domElement);
        rendererRef.current = null;
      }
      labelsContainer.innerHTML = ""; // Clear labels
    };
  }, [data]);

  return (
    <div className="pipeline-container">
      <h1>Pipeline Monitoring</h1>
      <div id="labels-container"></div>
      <div id="three-container"></div>
    </div>
  );
};

export default WaterFlowPage;
