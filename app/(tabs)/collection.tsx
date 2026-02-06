import { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { RecipeCard } from "@/components/recipe-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { DEMO_RECIPES } from "@/lib/demo-recipes";

export default function CollectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all recipes (collection shows everything)
  const { data, refetch } = trpc.recipe.list.useQuery({});

  // Toggle favorite mutation
  const toggleFavorite = trpc.recipe.toggleFavorite.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Delete recipe mutation
  const deleteRecipe = trpc.recipe.delete.useMutation({
    onSuccess: () => {
      refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  // Use demo recipes if database is empty
  const dbRecipes = data?.recipes || [];
  const recipes = dbRecipes.length > 0 ? dbRecipes : DEMO_RECIPES.map((demo) => ({
    id: demo.id,
    dishName: demo.title,
    description: demo.description,
    cuisine: demo.cuisine,
    category: demo.category,
    difficulty: demo.difficulty,
    prepTime: demo.prepTime,
    cookTime: demo.cookTime,
    servings: demo.servings,
    imageUrl: demo.imageUrl,
    ingredients: JSON.stringify(demo.ingredients),
    steps: JSON.stringify(demo.steps),
    tags: JSON.stringify(demo.tags),
    isFavorite: demo.isFavorite,
  }));

  const handleRecipePress = (recipe: typeof recipes[0]) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    router.push({
      pathname: "/recipe-card" as any,
      params: {
        recipeId: recipe.id,
        imageUri: ("heroImage" in recipe ? recipe.heroImage : "") || recipe.imageUrl || "",
        dishName: recipe.dishName,
        description: recipe.description,
        cuisine: recipe.cuisine || "",
        difficulty: recipe.difficulty,
        prepTime: String(recipe.prepTime),
        cookTime: String(recipe.cookTime),
        servings: String(recipe.servings),
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tags: recipe.tags || "[]",
        tikTokVideoUrl: ("tikTokVideo" in recipe ? recipe.tikTokVideo : "") || "",
        canRegen: ("videoRegenUsed" in recipe && recipe.videoRegenUsed) ? "false" : "true",
        stepImages: ("stepImages" in recipe ? recipe.stepImages : "[]") || "[]",
      },
    });
  };

  const handleFavoriteToggle = (recipeId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleFavorite.mutate({ id: recipeId });
  };

  const handleLongPress = (recipe: typeof recipes[0]) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      recipe.dishName,
      "What would you like to do?",
      [
        {
          text: recipe.isFavorite ? "Remove from Favorites" : "Add to Favorites",
          onPress: () => handleFavoriteToggle(recipe.id),
        },
        {
          text: "Delete Recipe",
          style: "destructive",
          onPress: () => confirmDelete(recipe),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const confirmDelete = (recipe: typeof recipes[0]) => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.dishName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRecipe.mutate({ id: recipe.id });
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderRecipeCard = ({ item }: { item: typeof recipes[0] }) => (
    <RecipeCard
      id={item.id}
      dishName={item.dishName}
      imageUrl={item.imageUrl}
      cookTime={item.prepTime + item.cookTime}
      isFavorite={item.isFavorite}
      onPress={() => handleRecipePress(item)}
      onFavoriteToggle={() => handleFavoriteToggle(item.id)}
      onLongPress={() => handleLongPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="book.fill" size={64} color="#333333" />
      <Text style={[styles.emptyTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
        Your Collection is Empty
      </Text>
      <Text style={[styles.emptySubtitle, { fontFamily: "Inter" }]}>
        Recipes you save will appear here. Start by capturing a photo of a dish!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
        My Collection
      </Text>
      <Text style={[styles.subtitle, { fontFamily: "Inter" }]}>
        {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} saved
      </Text>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        columnWrapperStyle={recipes.length > 0 ? styles.gridRow : undefined}
        renderItem={renderRecipeCard}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C9A962"
            colors={["#C9A962"]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    color: "#888888",
    marginTop: 4,
  },
  gridContent: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
  },
});
