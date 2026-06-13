import { Palmtree } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireLoisirs({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Loisirs"
      deptStep={4}
      Icon={Palmtree}
      questions={categoryQuestions}
      {...props}
    />
  );
}
