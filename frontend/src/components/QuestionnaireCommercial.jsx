import { Briefcase } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireCommercial({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Commercial"
      deptStep={3}
      Icon={Briefcase}
      questions={categoryQuestions}
      {...props}
    />
  );
}
