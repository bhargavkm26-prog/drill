import React, { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import "./GetStarted.css"

const GetStarted: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const singleTokens = [
      "DEPTH",
      "1520m",
      "SOIL",
      "FORMATIONS",
      "OIL",
      "BRENT",
      "CRUDE",
      "MUD",
      "LOSSES",
      "20",
      "bbl/hr",
      "PREDICT",
      "PORE",
      "PRESSURE",
      "12.5",
      "ppg",
      "ALTERS",
      "DECISION",
      "HISTORY",
      "HEIGHT",
      "4200m",
      "3250m",
      "5450m",
      "1520m",
      "BIT",
      "LIFE",
      "85%",
      "GAMMA",
      "RAY",
      "120",
      "API",
      "AZIMUTH",
      "180",
      "TEMP",
      "145°C",
      "7.2",
      "pH",
      "360",
      "GPM",
      "240",
      "LBM",
      "SANDSTONE",
      "LIMESTONE",
      "CLAY",
      "POROSITY",
      "18%",
      "PERMEABILITY",
      "750",
      "psi",
      "OFFSET",
      "ANALYSIS",
      "OPTIMIZING",
      "DRILL",
      "WELL",
      "FIELD",
      "RESERVOIR",
      "∑",
      "∫",
      "Δ",
      "μ",
      "σ",
      "π",
      "f(x)",
    ];

    interface Particle {
      isIcon: boolean;
      iconType: "rig" | "graph";
      text: string;
      x: number;
      y: number;
      speed: number;
      color: string;
      fontSize: number;
      alpha: number;
      isVertical: boolean;
    }

    const particles: Particle[] = [];
    const totalParticles = 100;

    let mouse = {
      x: -1000,
      y: -1000,
      radius: 220,
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const drawIcon = (
      type: "rig" | "graph",
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number
    ) => {
      ctx.save();

      ctx.translate(x, y);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.5;

      if (type === "rig") {
        ctx.beginPath();

        ctx.moveTo(0, -size);
        ctx.lineTo(-size / 2, size);
        ctx.lineTo(size / 2, size);
        ctx.closePath();

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(-size / 3, size / 3);
        ctx.lineTo(size / 3, size / 3);

        ctx.moveTo(-size / 4, -size / 3);
        ctx.lineTo(size / 4, -size / 3);

        ctx.stroke();
      } else if (type === "graph") {
        ctx.fillRect(
          -size / 2,
          size / 2,
          size / 4,
          -size / 2
        );

        ctx.fillRect(
          -size / 8,
          size / 2,
          size / 4,
          -size * 0.8
        );

        ctx.fillRect(
          size / 4,
          size / 2,
          size / 4,
          -size * 0.5
        );
      }

      ctx.restore();
    };

    for (let i = 0; i < totalParticles; i++) {
      const isIcon = Math.random() < 0.2;

      particles.push({
        isIcon,
        iconType: Math.random() > 0.5 ? "rig" : "graph",
        text:
          singleTokens[
          Math.floor(Math.random() * singleTokens.length)
          ],
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 1.0 + Math.random() * 1.8,
        color: Math.random() > 0.4 ? "#00e5ff" : "#ffb703",
        fontSize: 16 + Math.floor(Math.random() * 10),
        alpha: 0.6 + Math.random() * 0.4,
        isVertical: Math.random() > 0.85,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(2, 6, 8, 0.85)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
      ctx.lineWidth = 1;

      for (let x = 0; x < canvas.width; x += 140) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      particles.forEach((particle) => {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        let offsetX = 0;
        let offsetY = 0;

        if (distance < mouse.radius) {
          const angle = Math.atan2(dy, dx);

          const force =
            (mouse.radius - distance) / mouse.radius;

          offsetX = -Math.cos(angle) * force * 40;
          offsetY = -Math.sin(angle) * force * 40;
        }

        if (particle.isIcon) {
          drawIcon(
            particle.iconType,
            particle.x + offsetX,
            particle.y + offsetY,
            particle.fontSize,
            particle.color,
            particle.alpha
          );
        } else {
          ctx.save();

          ctx.translate(
            particle.x + offsetX,
            particle.y + offsetY
          );

          if (particle.isVertical) {
            ctx.rotate(-Math.PI / 2);
          }

          ctx.font = `700 ${particle.fontSize}px "Courier New", monospace`;
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = particle.alpha;
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = 10;

          ctx.fillText(particle.text, 0, 0);

          ctx.restore();
        }

        particle.y += particle.speed;

        if (particle.y > canvas.height + 50) {
          particle.y = -50;
          particle.x = Math.random() * canvas.width;

          particle.text =
            singleTokens[
            Math.floor(Math.random() * singleTokens.length)
            ];
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="get-started-page">

      {/* Navigation Bar */}
      <nav className="navbar">
        <div
          className="nav-brand"
          onClick={scrollToTop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              scrollToTop();
            }
          }}
        >
          <svg
            className="layers-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <polygon points="12,2 22,7 12,12 2,7" />
            <polygon points="12,13 20,9 12,15 4,9" />
            <polygon points="12,17 20,13 12,19 4,13" />
          </svg>
        </div>

        <div className="nav-actions">
          <a href="#about-page" className="nav-btn">
            About Us
          </a>

          <button onClick={() => navigate('/login')} className="nav-btn btn-login cursor-pointer">
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <canvas
          ref={canvasRef}
          id="bgCanvas"
          aria-hidden="true"
        />

        <div className="hero-container">

          <div className="start-line">
            <svg
              className="layers-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <polygon points="12,2 22,7 12,12 2,7" />
              <polygon points="12,13 20,9 12,15 4,9" />
              <polygon points="12,17 20,13 12,19 4,13" />
            </svg>

            <span>eRTMAC-NWIS</span>
          </div>

          <h1 className="main-heading">
            Explore. Understand. Decide.
          </h1>

          <p className="subheading">
            From reservoir historical data to field-level
            decisions.
            <br />
            Optimizing drilling operations with intelligent
            offset well analysis.
          </p>

          <button onClick={() => navigate('/login')} className="btn-get-started cursor-pointer">
            Get Started
            <span className="arrow">&rarr;</span>
          </button>

        </div>
      </section>

      {/* About Section */}
      <section id="about-page">
        <div className="about-content">

          <h2>About Our Solution</h2>

          <p>
            Our solution is an AI-powered decision-support
            platform for oil and gas drilling. It brings
            together historical well data, geological
            information, drilling records, and current well
            conditions to help engineers quickly find
            relevant information and identify potential
            drilling risks.
          </p>

          <p>
            Instead of manually searching through large
            amounts of historical data, our platform
            intelligently connects information from nearby
            and similar wells, making valuable drilling
            knowledge easier to access and use.
          </p>

          <h2>Our Mission</h2>

          <p>
            Our mission is to make drilling operations
            smarter, faster, and more proactive.
          </p>

          <p>
            We aim to help engineers learn from previous
            drilling experiences, understand current well
            conditions, and receive meaningful insights that
            can support better decisions. Our system is
            designed to assist engineers, not replace them,
            by combining human expertise with data-driven
            intelligence.
          </p>

          <h2>The Challenge We Address</h2>

          <p>
            Drilling operations can face unexpected
            challenges such as mud loss, stuck pipe,
            pressure-related events, torque spikes, and
            other abnormal conditions. Valuable information
            about these events may already exist in
            historical reports and previous wells, but
            finding and connecting this information manually
            can be difficult and time-consuming.
          </p>

          <p>
            Our solution addresses this gap by bringing
            historical knowledge and current drilling
            information together in one intelligent platform.
          </p>

          <h2>Learning From Previous Wells</h2>

          <p>
            Every previously drilled well contains valuable
            experience. It can tell us what happened, where
            it happened, at what depth, under which
            formation, and how the situation was handled.
          </p>

          <p>
            Our system uses this historical knowledge to
            identify patterns and similarities that may be
            relevant to the current well.
          </p>

          <div className="quote-box">
            Every old well has a lesson. Our platform helps
            bring that lesson forward.
          </div>

          <h2>Machine Learning</h2>

          <p>
            Machine Learning is at the core of our solution.
            Our model analyzes historical drilling data and
            compares it with the conditions of the current
            well.
          </p>

          <p>
            By considering factors such as location, depth,
            formation, and drilling conditions, the model
            identifies patterns that may indicate potential
            risks and helps provide early insights into
            upcoming drilling problems.
          </p>

          <div className="quote-box">
            Historical Data &rarr; Comparison &rarr; ML
            Analysis &rarr; Risk Prediction &rarr; Early
            Insight
          </div>

          <h2>Connecting the Past With the Present</h2>

          <p>
            Our platform connects what happened before with
            what is happening now.
          </p>

          <p>
            Historical wells provide valuable experience,
            while current well data provides the present
            situation. By bringing both together, our system
            can identify similar conditions and highlight
            relevant historical events that may help
            engineers prepare for potential risks.
          </p>

          <div className="quote-box">
            Past knowledge + Present data = Smarter decisions
          </div>

          <h2>Our Vision</h2>

          <p>
            We envision a future where valuable drilling
            knowledge is no longer buried in documents or
            limited to individual experience.
          </p>

          <p>
            Our goal is to transform historical drilling
            knowledge into accessible, intelligent, and
            actionable insights, helping engineers move from
            simply reacting to problems toward anticipating
            risks and making informed decisions.
          </p>

          <div className="quote-box">
            Learn from the past. Understand the present.
            Prepare for the future.
          </div>

        </div>
      </section>
    </div>
  );
};

export default GetStarted;
