import { BedDouble } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireChambreAffaires({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Chambres"
      deptStep={2}
      Icon={BedDouble}
      questions={categoryQuestions}
      {...props}
    />
  );
}
