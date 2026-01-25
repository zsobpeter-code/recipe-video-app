import { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TextInput,
  TouchableOpacity,
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

const CATEGORIES = ["All", "Main", "Soup", "Dessert", "Favorites"];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recipes
  const { data, refetch, isLoading } = trpc.recipe.list.useQuery({
    category: selectedCategory,
    search: searchQuery || undefined,
  });

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
    },
  });

  const recipes = data?.recipes || [];

  const handleCategoryPress = (category: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(category);
  };

  const handleRecipePress = (recipe: typeof recipes[0]) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    router.push({
      pathname: "/recipe-card" as any,
      params: {
        recipeId: recipe.id,
        imageUri: recipe.imageUrl || "",
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
      },
    });
  };

  const handleFavoriteToggle = (recipeId: string) => {
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
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
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
        No Recipes Yet
      </Text>
      <Text style={[styles.emptySubtitle, { fontFamily: "Inter" }]}>
        {searchQuery 
          ? "No recipes match your search. Try a different term."
          : selectedCategory === "Favorites"
          ? "You haven't favorited any recipes yet. Tap the heart icon on a recipe to add it here."
          : "Start by capturing a photo of a dish you'd like to recreate!"}
      </Text>
      {!searchQuery && selectedCategory === "All" && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push("/(tabs)/capture")}
          activeOpacity={0.8}
        >
          <IconSymbol name="camera.fill" size={20} color="#1A1A1A" />
          <Text style={[styles.emptyButtonText, { fontFamily: "Inter-Medium" }]}>
            Capture Recipe
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
          Recipe Studio
        </Text>
        <Text style={[styles.subtitle, { fontFamily: "Caveat" }]}>
          Your culinary collection
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={20} color="#888888" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter" }]}
            placeholder="Search recipes..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark" size={18} color="#888888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category pills */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === item && styles.categoryPillActive,
              ]}
              onPress={() => handleCategoryPress(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryText,
                  { fontFamily: "Inter-Medium" },
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Recipe grid */}
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        columnWrapperStyle={styles.gridRow}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 18,
    color: "#C9A962",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    padding: 0,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  categoryPillActive: {
    backgroundColor: "#C9A962",
    borderColor: "#C9A962",
  },
  categoryText: {
    fontSize: 14,
    color: "#AAAAAA",
  },
  categoryTextActive: {
    color: "#1A1A1A",
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
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C9A962",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    color: "#1A1A1A",
  },
});
