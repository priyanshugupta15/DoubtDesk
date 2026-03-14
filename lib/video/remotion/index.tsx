import { registerRoot, Composition } from 'remotion';
import { DoubtVideo } from './Composition';

registerRoot(() => {
    return (
        <Composition
            id="DoubtVideo"
            component={DoubtVideo}
            durationInFrames={600} 
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
                type: 'concept' as const,
                scenes: [
                    { title: "Introduction", text: "Welcome to your AI explanation.", duration: 5 }
                ]
            }}
        />
    );
});
