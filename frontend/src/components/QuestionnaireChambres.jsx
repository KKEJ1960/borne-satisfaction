import { Bed } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireChambres({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Chambres"
      deptStep={2}
      Icon={Bed}
      questions={categoryQuestions}
      {...props}
    />
  );
}
