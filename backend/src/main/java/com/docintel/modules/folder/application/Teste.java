package com.docintel.modules.folder.application;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Teste {

    public String longestPalindrome(String s) {
        StringBuilder sb = new StringBuilder();
        for (Character c : s.toCharArray()) {
            sb.append(c);
            if (isPalindrome(sb.toString())) {
                sb.delete(sb.length() - 1, sb.length());
            }
            List<String> cu = new ArrayList<>();
            cu.reversed();
            Map<Character, Integer> map = new HashMap<>();
        }

        return sb.toString();
    }

    private boolean isPalindrome(String s) {

        StringBuilder sb = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) {
            sb.append(s.charAt(i));
        }
        return sb.toString().equals(s);
    }
}
