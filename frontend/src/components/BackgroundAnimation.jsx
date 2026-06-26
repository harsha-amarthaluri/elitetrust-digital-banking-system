import { useEffect, useRef } from 'react';
import anime from 'animejs/lib/anime.es.js';
import '../styles/components/BackgroundAnimation.css';

const BackgroundAnimation = () => {
    const animationRef = useRef(null);

    useEffect(() => {
        animationRef.current = anime({
            targets: '.floating-shapes li',
            translateY: [0, -1000],
            rotate: [0, 720],
            opacity: [1, 0],
            borderRadius: ['0%', '50%'],
            duration: anime.stagger(15000, { start: 10000, direction: 'reverse' }),
            delay: anime.stagger(2000),
            easing: 'linear',
            loop: true,
        });

        // Add some random horizontal movement
        anime({
            targets: '.floating-shapes li',
            translateX: () => anime.random(-50, 50),
            duration: () => anime.random(5000, 10000),
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });

        return () => {
            if (animationRef.current) animationRef.current.pause();
        };
    }, []);

    return (
        <div className="background-animation-container">
            <ul className="floating-shapes">
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
            </ul>
        </div>
    );
};

export default BackgroundAnimation;
