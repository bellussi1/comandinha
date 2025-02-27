import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import MenuItem from "./MenuItem";

const CategorySection = ({ category, onAddItem }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <CardTitle className="text-lg">{category.nome}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {category.items.map((item) => (
            <MenuItem key={item.id} item={item} onAdd={() => onAddItem(item)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategorySection;
