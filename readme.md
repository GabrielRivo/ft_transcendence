# Ft_Transcendence

> Final project of the 42 School common core. A group project featuring a heavily enhanced and complete implementation of a Pong SPA.

![Status](https://img.shields.io/badge/Status-Completed-success)
&emsp;
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=000)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![Babylon3D](https://img.shields.io/badge/Babylon3D-F37021?logo=babylondotjs&logoColor=fff)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=fff)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=fff)
![RabbitMQ](https://img.shields.io/badge/Rabbitmq-FF6600?logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)
![Nginx](https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white)

## Introduction

This project consists of a **Pong game SPA (Single Page Application)** including tournaments, built under strict technical constraints. It is expanded with by a large selection of optional features and modules chosen by the team members.

**Note:** Some frameworks and tools had to be recoded from scratch to comply with the school's subject (e.g., React / NestJS architectures).
The project was completed on 31/01/2026 by a team of 4 developers, over a span of 2 months.

<div align="center">
  <img src="https://github.com/user-attachments/assets/b1d15514-f25b-4995-862f-08b41f0dfac5" alt="Gameplay">
</div>

## Features

#### Core & Major Modules
- **Microservices Architecture:** Designing the backend as a suite of independent, scalable services. Integrating RabbitMQ for asynchronous, event-driven communication.
- **Server-Side Pong & API:** Implementing a server-side game engine and a dedicated API to ensure game integrity.
- **Advanced Security (2FA & JWT):** Full implementation of Two-Factor Authentication and JSON Web Tokens for secure sessions.
- **Remote Authentication:** Integration of external authentication systems (Discord/GitHub).
- **Standard User Management:** Comprehensive system for user profiles, authentication, and player tracking across tournaments.
- **Remote Players:** Real-time multiplayer synchronization for online gameplay.
- **Live Chat:** Real-time messaging system for player interaction.
- **Advanced 3D Techniques:** Implementation of high-end 3D rendering and visual effects.
- **Backend Framework:** Using a robust framework to build the core backend logic.

#### Secondary & Minor Modules
- **Frontend Framework/Toolkit:** Using a modern framework to build a responsive user interface.
- **Database Integration:** Dedicated database for persistent data storage and backend support.
- **User & Game Stats Dashboards:** Detailed visualization of player performance and match history.
- **Browser Compatibility:** Expanding and optimizing support across various web browsers

## My work

My tasks were mainly focused on the game development and integration. I worked with websockets to implement a game with precise yet efficient physics. 

To ensure a smooth multiplayer experience, I implemented client prediction and server state reconciliation systems. This allows for a lag-free experience for each client while greatly optimizing server performance and providing total gameplay security.

## Install project

```bash
git clone git@github.com:GabrielRivo/Ft_Transcendence.git
cd ft_transcendence
```

## Start the project

#### 1 - Setup your own .env file using .env.example
```bash
cp .env.example .env
```

#### 2 - Build and run
```bash
make up
```
<br><br>

## Demo Video

<a href="https://youtu.be/7qPfisuVZOc">
   <img src="https://img.youtube.com/vi/7qPfisuVZOc/maxresdefault.jpg" width="400" alt="Watch the video">
</a>

<br><br>

## The team

- [Maxence Morot](https://github.com/WaRtr0)
- [Romane Golfetto](https://github.com/rgolfett)
- [Rafael Sequeira](https://github.com/RS69X)
- [Gabriel Rivo](https://github.com/GabrielRivo)
