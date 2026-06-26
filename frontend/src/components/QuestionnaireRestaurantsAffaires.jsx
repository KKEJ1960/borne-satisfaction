import { UtensilsCrossed } from "lucide-react";
import QuestionnaireScreen from "./QuestionnaireScreen";

export default function QuestionnaireRestaurantsAffaires({ categoryQuestions = [], ...props }) {
  return (
    <QuestionnaireScreen
      deptName="Restaurants"
      deptStep={4}
      Icon={UtensilsCrossed}
      questions={categoryQuestions}
      {...props}
    />
  );
}
