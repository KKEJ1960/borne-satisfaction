import { Flame } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireAlocodrome({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="L'Alocodrome"
      deptStep={5}
      Icon={Flame}
      questions={categoryQuestions}
      {...props}
    />
  );
}
