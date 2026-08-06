def find_content_children(g, s):
    """
    Finds the maximum number of content children given greed factors (g)
    and cookie sizes (s).
    """
    # Sort children's greed factor and cookie sizes
    g.sort()
    s.sort()
    
    child_pointer = 0
    cookie_pointer = 0
    
    # Match cookies to children
    g_len = len(g)
    s_len = len(s)
    
    while child_pointer < g_len and cookie_pointer < s_len:
        # If cookie satisfies the child, move to next child
        if s[cookie_pointer] >= g[child_pointer]:
            child_pointer += 1
        # Always move to the next cookie
        cookie_pointer += 1
        
    # The index of child_pointer equals the number of content children
    return child_pointer


if __name__ == "__main__":
    # Example usage:
    greed = [1, 2, 3]
    cookies = [1, 1]
    result = find_content_children(greed, cookies)
    print(f"Content children: {result}")  # Expected: 1
