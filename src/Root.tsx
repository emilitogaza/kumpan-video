import { Composition, Folder, getRemotionEnvironment, getStaticFiles } from "remotion";
import { calculateMetadata, Episode, FPS } from "./Episode";

const shared = { component: Episode, calculateMetadata, durationInFrames: 1, fps: FPS, width: 1920, height: 1080 };

export const RemotionRoot = () => {
  // When build.sh renders, the public folder is a single episode's audio folder, so props.json is right at the top.
  if (!getRemotionEnvironment().isStudio) return <Composition id="Episode" {...shared} defaultProps={{ src: "props.json" }} />;

  // In the Studio the public folder is courses/, so we list every episode that has been voiced, one folder per course.
  const byCourse = new Map<string, string[]>();
  for (const { name } of getStaticFiles()) {
    const [course, dir, episode, file] = name.split("/");
    if (dir === "audio" && file === "props.json") byCourse.set(course, [...(byCourse.get(course) ?? []), episode]);
  }
  return [...byCourse].map(([course, episodes]) => (
    <Folder key={course} name={course}>
      {episodes.sort().map((episode) => (
        // Remotion only allows letters, digits and "-" in an id, so "my_course" opens as "my-course".
        <Composition key={episode} id={`${course}-${episode}`.replace(/[^a-zA-Z0-9-]/g, "-")} {...shared} defaultProps={{ src: `${course}/audio/${episode}/props.json` }} />
      ))}
    </Folder>
  ));
};
