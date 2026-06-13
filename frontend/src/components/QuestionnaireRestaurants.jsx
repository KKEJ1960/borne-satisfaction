import { UtensilsCrossed } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireRestaurants({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Restaurants"
      deptStep={3}
      Icon={UtensilsCrossed}
      questions={categoryQuestions}
      {...props}
    />
  );
}
